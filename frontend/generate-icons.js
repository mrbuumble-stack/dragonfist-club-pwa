const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputImagePath = path.join(__dirname, '../LOGO 1.png');
const outputDir = path.join(__dirname, 'public');

const sizes = [
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-384.png', size: 384 },
    { name: 'icon-512.png', size: 512 },
    { name: 'apple-icon.png', size: 180 }
];

async function generateIcons() {
    if (!fs.existsSync(inputImagePath)) {
        console.error(`Input image not found: ${inputImagePath}`);
        return;
    }

    try {
        console.log(`Starting transparent circular icon generation...`);
        
        for (const { name, size } of sizes) {
            const outputPath = path.join(outputDir, name);
            try {
                // Create a circular SVG mask matching the target size
                const maskSvg = Buffer.from(
                    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
                        <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/>
                    </svg>`
                );
                
                // Resize first, then apply the circular mask to make corners transparent
                await sharp(inputImagePath)
                    .resize(size, size, {
                        fit: 'contain',
                        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background padding
                    })
                    .composite([{
                        input: maskSvg,
                        blend: 'dest-in'
                    }])
                    .toFile(outputPath);
                console.log(`Successfully generated circular transparent icon: ${name} (${size}x${size})`);
            } catch (err) {
                console.error(`Error generating ${name}:`, err);
            }
        }
    } catch (err) {
        console.error("Error in generateIcons process:", err);
    }
}

generateIcons();
