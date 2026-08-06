import AppKit
import WebKit

// Sidenote.app — native shell around the Sidenote server.
// Stages the bundled Next.js server into Application Support (the app bundle
// stays sealed/read-only), runs it on the Sidenote Engine (bundled node),
// and shows http://127.0.0.1:4747 in a WKWebView window.

let PORT = 4747
let BASE_URL = URL(string: "http://127.0.0.1:\(PORT)/")!

func log(_ msg: String) {
    let line = "[shell] \(msg)\n"
    FileHandle.standardError.write(line.data(using: .utf8)!)
    if let h = try? FileHandle(forWritingTo: AppDelegate.logURL) {
        h.seekToEndOfFile()
        h.write(line.data(using: .utf8)!)
        try? h.close()
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate {
    static let logURL: URL = {
        let dir = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("Library/Logs")
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let url = dir.appendingPathComponent("Sidenote.log")
        if !FileManager.default.fileExists(atPath: url.path) {
            FileManager.default.createFile(atPath: url.path, contents: nil)
        }
        return url
    }()

    var window: NSWindow!
    var webView: WKWebView!
    var spinner: NSProgressIndicator!
    var statusLabel: NSTextField!

    var server: Process?
    var quitting = false
    var respawns: [Date] = []
    var loadedOnce = false

    // MARK: - Launch

    func applicationDidFinishLaunching(_ notification: Notification) {
        buildMenu()
        // Runs before the server boots, so relaunching from the new location
        // can never collide with our own port.
        if relocateIfNeeded() { return }
        buildWindow()
        DispatchQueue.global(qos: .userInitiated).async { self.bootServer() }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        if !flag { window.makeKeyAndOrderFront(nil) }
        return true
    }

    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        // Flag before anything else so the termination handler can't win the
        // race and respawn an orphaned server.
        quitting = true
        server?.terminationHandler = nil
        return .terminateNow
    }

    func applicationWillTerminate(_ notification: Notification) {
        quitting = true
        server?.terminationHandler = nil
        server?.terminate()
        // Give node a moment to exit cleanly.
        if let s = server, s.isRunning {
            let deadline = Date().addingTimeInterval(2)
            while s.isRunning && Date() < deadline { usleep(50_000) }
        }
    }

    // MARK: - Where the app lives

    // Opened straight from the download, macOS runs the app from a random,
    // read-only AppTranslocation path. Full Disk Access is granted per path,
    // so a grant made there is worthless the moment the app relaunches — the
    // permission simply never sticks. Getting into /Applications first is the
    // difference between the FDA flow working and quietly failing forever.
    typealias IsTranslocatedFn = @convention(c) (
        CFURL, UnsafeMutablePointer<DarwinBoolean>, UnsafeMutablePointer<Unmanaged<CFError>?>?
    ) -> Bool
    typealias OriginalPathFn = @convention(c) (
        CFURL, UnsafeMutablePointer<Unmanaged<CFError>?>?
    ) -> Unmanaged<CFURL>?

    static let securityHandle = dlopen("/System/Library/Frameworks/Security.framework/Security", RTLD_LAZY)

    var isTranslocated: Bool {
        guard let sym = dlsym(Self.securityHandle, "SecTranslocateIsTranslocatedURL") else {
            return Bundle.main.bundleURL.path.contains("/AppTranslocation/")
        }
        let fn = unsafeBitCast(sym, to: IsTranslocatedFn.self)
        var flag: DarwinBoolean = false
        guard fn(Bundle.main.bundleURL as CFURL, &flag, nil) else {
            return Bundle.main.bundleURL.path.contains("/AppTranslocation/")
        }
        return flag.boolValue
    }

    // The real on-disk location, seeing through translocation.
    var trueBundleURL: URL {
        guard isTranslocated, let sym = dlsym(Self.securityHandle, "SecTranslocateCreateOriginalPathForURL") else {
            return Bundle.main.bundleURL
        }
        let fn = unsafeBitCast(sym, to: OriginalPathFn.self)
        guard let out = fn(Bundle.main.bundleURL as CFURL, nil) else { return Bundle.main.bundleURL }
        return out.takeRetainedValue() as URL
    }

    var applicationsDirs: [String] {
        ["/Applications", NSHomeDirectory() + "/Applications"]
    }

    var livesInApplications: Bool {
        let path = trueBundleURL.deletingLastPathComponent().path
        return applicationsDirs.contains(path)
    }

    /// Returns true when the app is relaunching from a new location and this
    /// instance should stand down.
    func relocateIfNeeded() -> Bool {
        let translocated = isTranslocated
        if !translocated && livesInApplications { return false }

        let alert = NSAlert()
        alert.alertStyle = .informational
        alert.icon = NSApp.applicationIconImage
        if translocated {
            alert.messageText = "Move Sidenote to your Applications folder"
            alert.informativeText = """
                macOS is running Sidenote from a temporary read-only copy because it was opened \
                straight from the download. Full Disk Access can't stick to a temporary copy, so \
                Sidenote wouldn't be able to read your Messages.

                Moving it to Applications takes a second and fixes this for good.
                """
        } else {
            alert.messageText = "Keep Sidenote in your Applications folder?"
            alert.informativeText = """
                Sidenote is running from \(trueBundleURL.deletingLastPathComponent().path). \
                Full Disk Access is granted per location, so if you move Sidenote later you'd \
                have to grant it again. Applications is the safe home.
                """
        }
        alert.addButton(withTitle: "Move to Applications")
        alert.addButton(withTitle: translocated ? "Open Anyway" : "Not Now")
        NSApp.activate(ignoringOtherApps: true)
        guard alert.runModal() == .alertFirstButtonReturn else { return false }

        do {
            let moved = try moveToApplications()
            let config = NSWorkspace.OpenConfiguration()
            config.createsNewApplicationInstance = true
            NSWorkspace.shared.openApplication(at: moved, configuration: config) { _, error in
                if let error {
                    log("relaunch failed: \(error.localizedDescription)")
                }
                DispatchQueue.main.async { NSApp.terminate(nil) }
            }
            return true
        } catch {
            let failed = NSAlert()
            failed.alertStyle = .warning
            failed.messageText = "Couldn't move Sidenote"
            failed.informativeText = """
                \(error.localizedDescription)

                Drag Sidenote into your Applications folder yourself, then open it from there.
                """
            failed.addButton(withTitle: "Open Anyway")
            failed.runModal()
            return false
        }
    }

    func moveToApplications() throws -> URL {
        let fm = FileManager.default
        let source = trueBundleURL
        let dir = fm.isWritableFile(atPath: "/Applications")
            ? "/Applications"
            : NSHomeDirectory() + "/Applications"
        try fm.createDirectory(atPath: dir, withIntermediateDirectories: true)
        let dest = URL(fileURLWithPath: dir).appendingPathComponent("Sidenote.app")

        if fm.fileExists(atPath: dest.path) {
            // Replacing an older install: trash it rather than deleting outright.
            _ = try? fm.trashItem(at: dest, resultingItemURL: nil)
            try? fm.removeItem(at: dest)
        }
        try fm.copyItem(at: source, to: dest)

        // Quarantine is what triggers translocation; clearing it on the copy
        // keeps the Applications install at a stable path forever.
        _ = shell("/usr/bin/xattr", ["-dr", "com.apple.quarantine", dest.path])

        // Tidy up the download the user opened, when we can see it.
        if source != Bundle.main.bundleURL || !isTranslocated {
            _ = try? fm.trashItem(at: source, resultingItemURL: nil)
        }
        log("moved to \(dest.path)")
        return dest
    }

    // MARK: - Window

    func buildWindow() {
        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1280, height: 840),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered, defer: false)
        window.title = "Sidenote"
        window.minSize = NSSize(width: 760, height: 500)
        window.setFrameAutosaveName("SidenoteMain")
        window.center()

        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.preferences.isElementFullscreenEnabled = true
        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsMagnification = true
        webView.isHidden = true

        let content = NSView()
        webView.translatesAutoresizingMaskIntoConstraints = false
        content.addSubview(webView)

        spinner = NSProgressIndicator()
        spinner.style = .spinning
        spinner.controlSize = .regular
        spinner.startAnimation(nil)
        spinner.translatesAutoresizingMaskIntoConstraints = false
        content.addSubview(spinner)

        statusLabel = NSTextField(labelWithString: "Starting Sidenote…")
        statusLabel.font = .systemFont(ofSize: 13)
        statusLabel.textColor = .secondaryLabelColor
        statusLabel.alignment = .center
        statusLabel.translatesAutoresizingMaskIntoConstraints = false
        content.addSubview(statusLabel)

        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: content.topAnchor),
            webView.bottomAnchor.constraint(equalTo: content.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: content.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: content.trailingAnchor),
            spinner.centerXAnchor.constraint(equalTo: content.centerXAnchor),
            spinner.centerYAnchor.constraint(equalTo: content.centerYAnchor, constant: -20),
            statusLabel.centerXAnchor.constraint(equalTo: content.centerXAnchor),
            statusLabel.topAnchor.constraint(equalTo: spinner.bottomAnchor, constant: 14),
        ])

        window.contentView = content
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    func setStatus(_ text: String) {
        DispatchQueue.main.async { self.statusLabel.stringValue = text }
    }

    // MARK: - Server lifecycle

    var resources: URL { Bundle.main.resourceURL! }
    var engineURL: URL {
        Bundle.main.bundleURL.appendingPathComponent("Contents/Helpers/Sidenote Engine")
    }
    var buildTag: String {
        (Bundle.main.infoDictionary?["SidenoteCommit"] as? String).map { String($0.prefix(12)) } ?? "dev"
    }
    var stagedServerURL: URL {
        FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("Library/Application Support/Sidenote/server-\(buildTag)")
    }

    func bootServer() {
        retireLaunchAgent()
        if !serverIsUp() {
            do {
                try stageServer()
            } catch {
                fail("Couldn't set up the Sidenote server: \(error.localizedDescription)")
                return
            }
            clearPort()
            spawnServer()
        }
        setStatus("Waking up the engine…")
        let deadline = Date().addingTimeInterval(90)
        while Date() < deadline {
            if serverIsUp() {
                DispatchQueue.main.async { self.webView.load(URLRequest(url: BASE_URL)) }
                return
            }
            usleep(300_000)
        }
        fail("The Sidenote server didn't start. Details are in ~/Library/Logs/Sidenote.log")
    }

    // The pre-app installer ran Sidenote through launchd from ~/Sidenote.
    // The app owns the port now, so retire that agent once and for all.
    func retireLaunchAgent() {
        let plist = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("Library/LaunchAgents/lol.sidenote.app.plist")
        guard FileManager.default.fileExists(atPath: plist.path) else { return }
        log("retiring old launch agent")
        _ = shell("/bin/launchctl", ["bootout", "gui/\(getuid())/lol.sidenote.app"])
        try? FileManager.default.removeItem(at: plist)
    }

    func clearPort() {
        let out = shell("/usr/sbin/lsof", ["-ti", ":\(PORT)"])
        for pid in out.split(separator: "\n").compactMap({ Int32($0.trimmingCharacters(in: .whitespaces)) }) {
            log("killing stale process \(pid) on port \(PORT)")
            kill(pid, SIGTERM)
        }
        if !out.isEmpty { usleep(500_000) }
    }

    // Copy the bundled server tree to Application Support so the signed app
    // bundle is never written to (Next needs a writable .next/cache).
    func stageServer() throws {
        let fm = FileManager.default
        let target = stagedServerURL
        let marker = target.appendingPathComponent(".staged")
        if fm.fileExists(atPath: marker.path) { return }
        setStatus("Setting up Sidenote…")
        let parent = target.deletingLastPathComponent()
        try fm.createDirectory(at: parent, withIntermediateDirectories: true)
        // Sweep older builds.
        for entry in (try? fm.contentsOfDirectory(at: parent, includingPropertiesForKeys: nil)) ?? []
        where entry.lastPathComponent.hasPrefix("server-") {
            try? fm.removeItem(at: entry)
        }
        let source = resources.appendingPathComponent("server")
        let tmp = parent.appendingPathComponent("server-staging")
        try? fm.removeItem(at: tmp)
        try fm.copyItem(at: source, to: tmp)
        try fm.moveItem(at: tmp, to: target)
        fm.createFile(atPath: marker.path, contents: Data())
        log("staged server \(buildTag)")
    }

    func spawnServer() {
        let p = Process()
        p.executableURL = engineURL
        p.arguments = [stagedServerURL.appendingPathComponent("server.js").path]
        p.currentDirectoryURL = stagedServerURL
        var env = ProcessInfo.processInfo.environment
        env["PORT"] = String(PORT)
        env["HOSTNAME"] = "127.0.0.1"
        env["NODE_ENV"] = "production"
        env["SIDENOTE_APP"] = "1"
        // The bundle is what macOS lists under Full Disk Access — the UI needs
        // its real path, not the node binary buried inside it.
        env["SIDENOTE_APP_PATH"] = trueBundleURL.path
        if isTranslocated { env["SIDENOTE_TRANSLOCATED"] = "1" }
        if let commit = Bundle.main.infoDictionary?["SidenoteCommit"] as? String {
            env["SIDENOTE_COMMIT"] = commit
        }
        if let date = Bundle.main.infoDictionary?["SidenoteCommitDate"] as? String {
            env["SIDENOTE_COMMIT_DATE"] = date
        }
        p.environment = env
        if let h = try? FileHandle(forWritingTo: Self.logURL) {
            h.seekToEndOfFile()
            p.standardOutput = h
            p.standardError = h
        }
        p.terminationHandler = { [weak self] proc in
            guard let self, !self.quitting else { return }
            log("server exited (\(proc.terminationStatus)) — respawning")
            self.respawns = self.respawns.filter { $0.timeIntervalSinceNow > -30 }
            self.respawns.append(Date())
            if self.respawns.count > 5 {
                DispatchQueue.main.async {
                    self.fail("The Sidenote server keeps crashing. Details are in ~/Library/Logs/Sidenote.log")
                }
                return
            }
            DispatchQueue.global().asyncAfter(deadline: .now() + 0.4) {
                self.spawnServer()
                // The FDA flow restarts the server on purpose; reload once it's back.
                let deadline = Date().addingTimeInterval(30)
                while Date() < deadline {
                    if self.serverIsUp() {
                        DispatchQueue.main.async { self.webView.reload() }
                        return
                    }
                    usleep(300_000)
                }
            }
        }
        do {
            try p.run()
            server = p
            log("server spawned (pid \(p.processIdentifier))")
        } catch {
            fail("Couldn't start the Sidenote engine: \(error.localizedDescription)")
        }
    }

    func serverIsUp() -> Bool {
        var ok = false
        let sem = DispatchSemaphore(value: 0)
        var req = URLRequest(url: BASE_URL, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 2)
        req.httpMethod = "HEAD"
        URLSession.shared.dataTask(with: req) { _, resp, _ in
            ok = (resp as? HTTPURLResponse) != nil
            sem.signal()
        }.resume()
        sem.wait()
        return ok
    }

    func fail(_ message: String) {
        DispatchQueue.main.async {
            self.spinner.stopAnimation(nil)
            self.statusLabel.stringValue = message
            let alert = NSAlert()
            alert.messageText = "Sidenote couldn't start"
            alert.informativeText = message
            alert.addButton(withTitle: "Show Log")
            alert.addButton(withTitle: "Quit")
            if alert.runModal() == .alertFirstButtonReturn {
                NSWorkspace.shared.activateFileViewerSelecting([Self.logURL])
            }
            NSApp.terminate(nil)
        }
    }

    @discardableResult
    func shell(_ cmd: String, _ args: [String]) -> String {
        let p = Process()
        p.executableURL = URL(fileURLWithPath: cmd)
        p.arguments = args
        let pipe = Pipe()
        p.standardOutput = pipe
        p.standardError = FileHandle.nullDevice
        try? p.run()
        p.waitUntilExit()
        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        return String(data: data, encoding: .utf8) ?? ""
    }

    // MARK: - Navigation

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        if !loadedOnce {
            loadedOnce = true
            spinner.stopAnimation(nil)
            spinner.isHidden = true
            statusLabel.isHidden = true
            webView.isHidden = false
        }
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if navigationAction.shouldPerformDownload {
            decisionHandler(.download)
            return
        }
        if let url = navigationAction.request.url, let scheme = url.scheme?.lowercased(),
           ["http", "https"].contains(scheme),
           !["127.0.0.1", "localhost"].contains(url.host?.lowercased() ?? "") {
            NSWorkspace.shared.open(url)
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse,
                 decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        decisionHandler(navigationResponse.canShowMIMEType ? .allow : .download)
    }

    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
        download.delegate = self
    }

    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) {
        download.delegate = self
    }

    // Links with target=_blank open in the user's browser.
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction,
                 windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url { NSWorkspace.shared.open(url) }
        return nil
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = NSAlert()
        alert.messageText = message
        alert.runModal()
        completionHandler()
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = NSAlert()
        alert.messageText = message
        alert.addButton(withTitle: "OK")
        alert.addButton(withTitle: "Cancel")
        completionHandler(alert.runModal() == .alertFirstButtonReturn)
    }

    // MARK: - Downloads (transcript export)

    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse,
                  suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
        let downloads = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Downloads")
        var dest = downloads.appendingPathComponent(suggestedFilename)
        let base = dest.deletingPathExtension().lastPathComponent
        let ext = dest.pathExtension
        var n = 2
        while FileManager.default.fileExists(atPath: dest.path) {
            dest = downloads.appendingPathComponent("\(base) \(n)\(ext.isEmpty ? "" : ".\(ext)")")
            n += 1
        }
        lastDownload = dest
        completionHandler(dest)
    }

    var lastDownload: URL?

    func downloadDidFinish(_ download: WKDownload) {
        if let url = lastDownload {
            NSWorkspace.shared.activateFileViewerSelecting([url])
        }
    }

    // MARK: - Menu

    func buildMenu() {
        let main = NSMenu()

        let appItem = NSMenuItem()
        main.addItem(appItem)
        let appMenu = NSMenu()
        appItem.submenu = appMenu
        appMenu.addItem(withTitle: "About Sidenote",
                        action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Hide Sidenote", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Quit Sidenote", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")

        let editItem = NSMenuItem()
        main.addItem(editItem)
        let edit = NSMenu(title: "Edit")
        editItem.submenu = edit
        edit.addItem(withTitle: "Undo", action: Selector(("undo:")), keyEquivalent: "z")
        edit.addItem(withTitle: "Redo", action: Selector(("redo:")), keyEquivalent: "Z")
        edit.addItem(.separator())
        edit.addItem(withTitle: "Cut", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        edit.addItem(withTitle: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        edit.addItem(withTitle: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        edit.addItem(withTitle: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")

        let viewItem = NSMenuItem()
        main.addItem(viewItem)
        let view = NSMenu(title: "View")
        viewItem.submenu = view
        view.addItem(withTitle: "Reload", action: #selector(reload), keyEquivalent: "r")

        let windowItem = NSMenuItem()
        main.addItem(windowItem)
        let win = NSMenu(title: "Window")
        windowItem.submenu = win
        win.addItem(withTitle: "Minimize", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m")
        win.addItem(withTitle: "Zoom", action: #selector(NSWindow.performZoom(_:)), keyEquivalent: "")
        win.addItem(withTitle: "Close", action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w")
        NSApp.windowsMenu = win

        NSApp.mainMenu = main
    }

    @objc func reload() { webView.reload() }
}

let app = NSApplication.shared
app.setActivationPolicy(.regular)
let delegate = AppDelegate()
app.delegate = delegate
app.run()
