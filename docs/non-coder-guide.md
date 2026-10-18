# Non-Coder Guide: How ApexDoc Scanner Works

Welcome! If you are not a software engineer, this document explains in simple, plain English exactly what this tool is, how it works, and why it is special.

---

## 1. What is this tool?
**ApexDoc Scanner** is a website you open on your phone (or computer) that acts just like the native document scanner built into an iPhone.

You can:
1. Snap photos of documents, receipts, or notes with your phone camera.
2. Adjust the 4 corners of the paper with your finger (with a round magnifying glass so your thumb doesn't get in the way).
3. Watch the app automatically straighten the document (even if you took the photo at an angle or on a messy desk).
4. Apply professional filters that magically remove shadows, wrinkles, and dim room lighting, turning grey paper into crisp, laser-printer-quality black-and-white.
5. Combine multiple pages into a single PDF document.
6. Share the PDF directly via WhatsApp, AirDrop, Apple "Save to Files", or download it instantly.

---

## 2. Why is this different from apps like CamScanner or online converter websites?

| Traditional Apps & Websites | ApexDoc Scanner |
| :--- | :--- |
| **Expensive Subscriptions**: Charge $40-$60/year or show loud video ads. | **100% Free**: No subscriptions, no ads, no accounts, forever. |
| **Privacy Risk**: Upload your sensitive IDs and documents to their private servers. | **100% Private**: Runs entirely inside your phone. Nothing is ever uploaded to the internet. |
| **Internet Required**: Fails or hangs if your connection drops. | **Works Offline**: You can use it in Airplane Mode or underground without signal. |
| **App Store Hassle**: Must download a large 150MB native app from the App Store. | **Zero Install**: Just tap a web link. You can tap "Add to Home Screen" to turn it into an app icon. |

---

## 3. How does the "Magic" work under the hood?

### 📐 1. The Perspective Straightening (Homography)
When you take a photo of a document resting on a table, the paper looks like a trapezoid or a skewed quadrilateral because of camera perspective.
- ApexDoc uses a mathematical formula called **Projective Homography**.
- When you place the 4 corner dots on the corners of the paper, the browser calculates the mathematical angle and stretches/flattens the image into a perfect upright rectangle.

### 🔍 2. The Magnifying Glass (Loupe)
When using your finger on a smartphone touchscreen, your thumb naturally covers the exact corner you are trying to align.
- ApexDoc places a round magnifying lens floating **above** your finger.
- As you move your finger, the lens zooms in 2.5x with thin crosshairs, letting you pinpoint the exact corner down to the single pixel.

### 📄 3. Shadow Removal (Adaptive Thresholding)
If you take a photo indoors, your phone often casts a shadow over the paper, making one side dark and one side bright.
- Standard filters make the shadowed side completely black and unreadable.
- ApexDoc's **Adaptive Filter** breaks the paper down into small neighborhood windows. It figures out what is background paper and what is ink locally.
- The result: all shadows disappear, the paper becomes pure clean white, and the ink becomes crisp, dark black.

### 📑 4. In-Browser PDF Maker
Instead of sending your images to a remote computer to build a PDF, your phone's browser compiles the PDF internally using a tool called `jsPDF`. It outputs a high-resolution, compressed PDF file ready for sending in less than 1 second.

---

## 4. How to add it to your Phone Home Screen
1. Open the website link in **Safari** (on iPhone) or **Chrome** (on Android).
2. Tap the **Share** button (the square with an arrow pointing up on iOS, or the three dots menu on Android).
3. Scroll down and tap **"Add to Home Screen"**.
4. An icon will appear on your phone just like any regular app. When opened, it runs full-screen without address bars or browser clutter, and works even when offline!
