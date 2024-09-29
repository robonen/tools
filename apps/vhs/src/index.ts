import { version } from '../package.json';
import { resolve } from 'path';
import { $, Glob } from 'bun';

async function ffmpegMergeAndTranscodeAvi(files: Set<string>) {
  const ffmpeg = resolve('bin/ffmpeg');
  const output = resolve('output.mp4');
  const input = Array.from(files).toSorted((a, b) => a.localeCompare(b)).join('|');

  const shell = $`${ffmpeg} -i "concat:${input}" -stats -c:v libx264 -crf 23 -preset veryfast -c:a aac ${output}`;

  for await (const line of shell.lines()) {
    console.log(line);
  }
}

const path = Bun.argv[2];

if (!path) {
  console.error('Please provide a path to a file or directory');
  process.exit(1);
}

console.info(`Welcome to VHS v${version} 📼`);
console.info(`Scanning ${path}...`);

const glob = new Glob(resolve(path));
const files = new Set<string>();

for await (const file of glob.scan({ followSymlinks: false })) {
  files.add(file);
}

console.info(`Found ${files.size} files`);

console.info(await ffmpegMergeAndTranscodeAvi(files));