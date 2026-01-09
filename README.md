# KS Gift Code Redeemer

A simple desktop application to redeem KingShot gift codes for multiple users at once.

## Download

Download the latest release for your platform:

- **Windows**: `ks-redeemer-windows.exe`
- **macOS**: `ks-redeemer-macos`
- **Linux**: `ks-redeemer-linux`

## Usage

### Windows

1. Download `ks-redeemer-windows.exe`
2. Double-click to run
3. Your browser will automatically open to `http://localhost:3000`

### macOS

1. Download `ks-redeemer-macos`
2. Open Terminal and run:
   ```bash
   chmod +x ks-redeemer-macos
   ./ks-redeemer-macos
   ```
3. Your browser will automatically open to `http://localhost:3000`

### Linux

1. Download `ks-redeemer-linux`
2. Open Terminal and run:
   ```bash
   chmod +x ks-redeemer-linux
   ./ks-redeemer-linux
   ```
3. Your browser will automatically open to `http://localhost:3000`

## How to Use

1. Enter your gift code in the "Gift Code" field
2. Enter user IDs in the textarea, one per line
3. Click "Start Redemption"
4. Watch the live feed for progress

The application will automatically stop after 5 consecutive failures to prevent unnecessary requests.

## Building from Source

### Prerequisites

- [Bun](https://bun.sh/) (v1.0 or later)

### Development

```bash
# Install dependencies
bun install

# Start development server (with hot reload)
bun run dev
```

The development server runs on `http://localhost:5173` with the API proxied from `http://localhost:3000`.

### Building Executables

```bash
# Build for all platforms
bun run build:all

# Or build for a specific platform
bun run build:linux
bun run build:windows
bun run build:macos
```

Executables will be created in the `releases/` folder.

