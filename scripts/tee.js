const fs = require('fs');
const path = require('path');

const logPath = process.argv[2];
if (logPath) {
  const resolved = path.resolve(logPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const logStream = fs.createWriteStream(resolved, { flags: 'a' });

  process.stdin.on('data', (chunk) => {
    process.stdout.write(chunk);
    logStream.write(chunk);
  });

  process.stdin.on('end', () => {
    logStream.end();
  });
} else {
  process.stdin.pipe(process.stdout);
}
