# 🗺️ Travnimation

Travnimation is a web application that instantly turns plain-text travel itineraries into beautiful, animated map journey videos. Built entirely with modern web technologies, it allows you to visualize your trips and export them as high-quality MP4 videos (up to 4K 60FPS) directly from your browser—no backend rendering required.

## ✨ Features

- **Text-to-Route Generation**: Paste a simple text log (e.g., `20.00 start SPBU Pasteur`) and let the AI parser automatically geocode locations and build a chronological journey.
- **In-Browser Video Rendering**: Uses the modern WebCodecs API and `mp4-muxer` to export buttery smooth MP4 videos natively on your machine.
- **Customizable Aesthetics**: Choose between different aspect ratios (16:9, 9:16 vertical for TikTok/Reels), video qualities (720p to 4K), map themes, and transport icons.
- **Sleek HUD & Overlays**: Displays a real-time tracking HUD (time, distance) and animated milestone popups for stops and rest areas.

## 🚀 Tech Stack

- **Framework**: Next.js (App Router), React
- **Styling**: Tailwind CSS
- **Maps**: Leaflet (with minimalist OpenStreetMap basemaps)
- **Video Export**: WebCodecs, `mp4-muxer`, `html-to-image`
- **Icons**: Lucide React

## 💻 Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/IqbalMind/travnimation.git
   cd travnimation
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to start animating your journeys.

## 🛠️ Usage

1. Select your preferred travel method (Car, Shuttle, Bus, Plane, etc.).
2. Set your desired map theme and video settings (Aspect Ratio, Framerate, Quality).
3. Paste your itinerary into the text box. Example format:
   ```text
   20.00 start SPBU Pasteur
   20.47 Rest Area KM 88 B
   21.05 Rest Area KM 72B Cipularang
   Rest Until 21.23
   22.15 Tol Halim KM 0 Jakarta Bandung
   22.30 Finish Binus Kemanggisan
   ```
4. Click **Generate Route** to preview the animation in real-time.
5. Click **Download Video** to render the journey into a `.mp4` file directly to your device.

## 📜 License

MIT License. Feel free to use and modify!
