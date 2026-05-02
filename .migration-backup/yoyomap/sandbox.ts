import { Sandbox } from "@vercel/sandbox";

async function main() {
  const sandbox = await Sandbox.create();

  const cmd = await sandbox.runCommand("echo", ["Hello from Vercel Sandbox!"]);
  console.log(await cmd.stdout());

  await sandbox.stop();
}

void main();
