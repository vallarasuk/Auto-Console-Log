<div align="center">

# Auto Console Log By Vallarasu Kanthasamy

<div style="text-align: center; margin-bottom: 20px;">
  <img src="https://esobjkdsqwmmzhcwvzck.supabase.co/storage/v1/object/public/quotesimages//profileop.png" alt="Vallarasu Kanthasamy" width="80" style="border-radius: 50%; box-shadow: 0 3px 10px rgba(0,0,0,0.1);" />
  <p style="margin: 8px 0 0; font-weight: bold;">Vallarasu Kanthasamy</p>
</div>

![Built With](https://img.shields.io/badge/Built%20with-JavaScript-blue?style=flat-square&logo=javascript)
![Maintained](https://img.shields.io/maintenance/yes/2026?color=green&style=flat-square)
![Open Source](https://img.shields.io/badge/Open%20Source-Yes-brightgreen?style=flat-square)
[![Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/vallarasuk.auto-console-log?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=vallarasuk.auto-console-log)
[![Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/vallarasuk.auto-console-log?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=vallarasuk.auto-console-log)

<!-- --- -->

<!-- <img src="https://media.giphy.com/media/qgQUggAC3Pfv687qPC/giphy.gif" width="160" alt="coding animation" /> -->

> Automatically add `console.log()` statements for all variables in your file with just one shortcut.  
> Debug like a ninja ⚡ No manual effort. No wasted seconds.

</div>

<div align="center">
<!-- --- -->

## 🎯 Key Feature Highlight

<div align="center" style="padding: 30px; font-size: 20px; font-weight: 600; background: #fff8f6; color: #ff6f61; border: 3px dashed #ff6f61; border-radius: 20px; max-width: 680px;">
💥 Press <code>Ctrl + Alt + L</code> to instantly console.log ALL your variables in the file.  
No typing, no missing logs — just <strong>supercharged debugging</strong> ⚡
</div>

<!-- --- -->
</div>
<h1 align="center" style="margin: 1%;">🖼️ Before & After – See the Magic</h1>

<div style="display: flex; justify-content: center; align-items: center; margin: 40px 0; gap: 25px;">
  <img src="https://esobjkdsqwmmzhcwvzck.supabase.co/storage/v1/object/public/quotesimages//adio.png" width="49%" alt="Before Code" style="border-radius: 10px; box-shadow: 0 3px 10px rgba(0,0,0,0.1);" />
  <img src="https://img.icons8.com/ios-filled/50/ff6f61/long-arrow-right.png" width="3%" alt="arrow" style="vertical-align: middle;" />
  <img src="https://esobjkdsqwmmzhcwvzck.supabase.co/storage/v1/object/public/quotesimages//io.png" width="49%" alt="After Code" style="border-radius: 10px; box-shadow: 0 3px 10px rgba(0,0,0,0.1);" />
</div>

<blockquote>See the transformation — instantly!</blockquote>

## ⚙️ How to Use

Just hit the shortcut and BOOM 💥 — all variables in your file are automatically logged.

| OS               | Add All Logs     | Add Selection Log | Remove Logs      |
| ---------------- | ---------------- | ----------------- | ---------------- |
| 🪟 Windows/Linux | `Ctrl + Alt + L` | `Ctrl + L`        | `Ctrl + Alt + R` |
| 🍎 macOS         | `Cmd + Alt + L`  | `Cmd + L`         | `Cmd + Alt + R`  |

---

---

## 📦 Installation

1. Open **Extensions** in VS Code (`Ctrl + Shift + X`)
2. Search: `Auto Console Log By Vallarasu Kanthasamy`
3. Click **Install**
4. Done! 🎉

Or install from the [Marketplace →](https://marketplace.visualstudio.com/items?itemName=vallarasuk.auto-console-log)

> ⚡ **Zero setup required!** On first install, the extension automatically disables conflicting keybindings (like VS Code's built-in `Ctrl+L` "Expand Line Selection") so your shortcuts work immediately.

> 🔧 If shortcuts still don't work after install, open the Command Palette (`Ctrl+Shift+P`) and run **`Auto Console Log: Fix Keybinding Conflicts`**.

---

## ✅ Supported Languages & Log Formats

| Language               | Extension     | Log Format                                  |
| :--------------------- | :------------ | :------------------------------------------ |
| **JavaScript / React** | `.js`, `.jsx` | `console.log("var:", var);`                 |
| **TypeScript / React** | `.ts`, `.tsx` | `console.log("var:", var);`                 |
| **Python**             | `.py`         | `print(f"var: {var}")`                      |
| **Java**               | `.java`       | `System.out.println("var: " + var);`        |
| **C#**                 | `.cs`         | `Console.WriteLine($"var: {var}");`         |
| **Go**                 | `.go`         | `fmt.Printf("var: %+v\n", var)`             |
| **PHP**                | `.php`        | `error_log("var: " . print_r($var, true));` |
| **C++**                | `.cpp`        | `std::cout << "var: " << var << std::endl;` |
| **Swift**              | `.swift`      | `print("var: \(var)")`                      |

_Note: The extension automatically detects the language based on the file extension._

---

## 🧪 Comparison Table

| Feature              | Turbo Console Log ❄️        | Auto Console Log 🔥 (Yours)                   |
| -------------------- | --------------------------- | --------------------------------------------- |
| Logging Method       | One by one manually         | All at once automatically                     |
| Productivity Boost   | 🐢 Medium                   | ⚡ High                                       |
| Output Style         | `console.log('var:', var);` | `console.log("var:", var);`                   |
| Supported File Types | JS / TS / React             | JS, TS, Python, Java, C#, Go, PHP, C++, Swift |
| Keybinding Conflicts | Manual fix required         | ✅ Auto-resolved on install                   |

---

## 🔥 Features Recap

✅ One-shot shortcut logging  
✅ **Precision Selection Logging:** Highlight any variable and press `Ctrl + L` to log it securely on the next line with **smart block indentation** analysis.  
✅ **File-wide Log Removal:** Press `Ctrl + Alt + R` to instantly clean up all auto-generated logs in your file.  
✅ **Custom Log Templates:** Define your own log format (Free for everyone)  
✅ **Remote Logging:** Sync logs to an external URL (Free for everyone)  
✅ Custom log levels (`log`, `info`, `warn`, `error`)  
✅ Supports 9+ Languages (JS, Python, Java, Go, C++, Swift, PHP, C#, etc.)  
✅ **Multi-line Formatter Resilient:** Safely adds and removes console logs even if code formatters (like Prettier) split them across multiple lines.
✅ Lightning-fast debugging for real projects  
✅ **Auto-disables conflicting keybindings on install** — works out of the box  
✅ Manual keybinding fix via Command Palette (`Auto Console Log: Fix Keybinding Conflicts`)

---

## 👨‍💻 About the Developer

> Hey there! I'm **Vallarasu Kanthasamy**, a React Developer from Bangalore 🚀  
> I love building smart tools that help developers save time and stay productive.

**Tech Stack**

- ⚛️ React, React Native, Node.js, Express.js
- 🌐 WordPress Plugin & Theme Development
- 🧰 Productivity Automation Tools

**Projects**

- ✅ [ATS Resume Maker](https://atsresumemaker.vallarasuk.com)
- 📚 [Developer PDF Resource Hub (850+ PDFs)](https://www.vallarasuk.com/resources)
- 🎥 [Daily Focus Reels](https://www.instagram.com/daily_focus_track/reels/)
- 📄 [vallarasuk.com](https://www.vallarasuk.com)

---

## 🌐 Connect with Me

- 🔗 [Website](https://www.vallarasuk.com)
- 💼 [LinkedIn](https://linkedin.com/in/vallarasu-kanthasamy)
- 📂 [GitHub](https://github.com/vallarasuk)
- 📬 [Join WhatsApp Community](https://chat.whatsapp.com/JzCFT47gI6aE8O6mJA96V0)

---

## 🤝 Contributing

Pull requests and suggestions are welcome!  
Fork this repo and create an issue to suggest features or improvements.

---

## ❓ FAQ

<details>
  <summary>Does it work with React?</summary>
  <p>Absolutely! It works perfectly with `.js`, `.ts`, `.jsx`, and `.tsx` files.</p>
</details>

<details>
  <summary>Can I change log type?</summary>
  <p>Yes — choose between <code>log</code>, <code>info</code>, <code>warn</code>, and <code>error</code>.</p>
</details>

<details>
  <summary>Is this better than Turbo Console Log?</summary>
  <p>Yes! This tool logs all variables at once, saving more time than Turbo Console Log, which logs only one variable at a time.</p>
</details>

---

## 🚀 Start Debugging Smarter Now

<div align="center" style="padding: 35px; background: #111; border-radius: 18px; box-shadow: 0 0 30px #ff6f61;">
  <h2 style="color:#ff6f61;">🚀 Install & Slash Debug Time</h2>
  <p style="color:#eee; font-size:20px;">Automate logging and focus on solving problems — not typing logs.</p>
  <a href="https://marketplace.visualstudio.com/items?itemName=vallarasuk.auto-console-log" target="_blank">
    <img src="https://img.shields.io/badge/Install%20Now-VS%20Code%20Marketplace-blue?style=for-the-badge" />
  </a>
</div>
