const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');

// Load environment variables from .env file
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

function run(cmd, opts = {}) {
    console.log(`\n> ${cmd}`);
    execSync(cmd, { stdio: 'inherit', ...opts });
}

function checkEnv(varName) {
    if (!process.env[varName]) {
        console.error(`❌ Missing required environment variable: ${varName}`);
        process.exit(1);
    }
}

// Check AWS credentials
checkEnv('AWS_ACCESS_KEY_ID');
checkEnv('AWS_SECRET_ACCESS_KEY');

console.log('🚧 Building TypeScript...');
run('npm run build', { cwd: __dirname });

console.log('📦 Zipping build folder...');

const distFolder = path.join(__dirname, 'dist');
const zipFile = path.join(__dirname, 'lambda-deployment.zip');

// Clean old zip if it exists
if (fs.existsSync(zipFile)) fs.unlinkSync(zipFile);

// Create zip
const zip = new AdmZip();
if (!fs.existsSync(distFolder)) {
    console.error('❌ dist/ folder not found. Please build the project first.');
    process.exit(1);
}
zip.addLocalFolder(distFolder);
zip.writeZip(zipFile);

console.log('✅ Zipped to lambda-deployment.zip');

console.log('🚀 Deploying to AWS Lambda with Serverless...');
run('npx serverless deploy', { cwd: __dirname });

console.log('\n✅ Deployment complete!');