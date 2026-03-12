import { removeBackground } from '@imgly/background-removal-node';
import { readdir, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const IMGLY_DIST = path.resolve(__dirname, '..', '..', 'node_modules', '@imgly', 'background-removal-node', 'dist');
const IMGLY_PUBLIC_PATH = `${pathToFileURL(IMGLY_DIST).href.replace(/\/+$/, '')}/`;

const INPUT_DIR  = path.resolve(__dirname, process.argv[2] ?? 'input');
const OUTPUT_DIR = path.resolve(__dirname, process.argv[3] ?? 'output');

const SUPPORTED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const MIME_BY_EXT = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.avif': 'image/avif',
};

async function run() {
	if (!existsSync(IMGLY_DIST)) {
		console.error(`Dependency folder not found: ${IMGLY_DIST}`);
		console.error('Run: npm install @imgly/background-removal-node --save-dev');
		process.exit(1);
	}

	if (!existsSync(INPUT_DIR)) {
		console.error(`Input directory not found: ${INPUT_DIR}`);
		process.exit(1);
	}

	await mkdir(OUTPUT_DIR, { recursive: true });

	const entries = await readdir(INPUT_DIR);
	const images  = entries.filter((f) => SUPPORTED.has(path.extname(f).toLowerCase()));

	if (!images.length) {
		console.log('No supported images found in input directory.');
		return;
	}

	console.log(`Processing ${images.length} image(s)…\n`);

	for (const filename of images) {
		const inputPath  = path.join(INPUT_DIR, filename);
		const outputName = path.parse(filename).name + '.png';
		const outputPath = path.join(OUTPUT_DIR, outputName);

		process.stdout.write(`  ${filename} → ${outputName} … `);

		try {
			const buffer = await readFile(inputPath);
			const ext = path.extname(filename).toLowerCase();
			const mime = MIME_BY_EXT[ext] ?? 'application/octet-stream';
			const blob = new Blob([buffer], { type: mime });

			const resultBlob = await removeBackground(blob, {
				publicPath: IMGLY_PUBLIC_PATH,
			});

			const arrayBuffer = await resultBlob.arrayBuffer();
			await writeFile(outputPath, Buffer.from(arrayBuffer));

			console.log('done');
		} catch (err) {
			console.log('FAILED');
			console.error(`    Error: ${err.message}`);
		}
	}

	console.log(`\nAll done. Results in: ${OUTPUT_DIR}`);
}

run();
