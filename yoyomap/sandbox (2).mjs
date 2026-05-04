import { Sandbox } from "@vercel/sandbox";

const sandbox = await Sandbox.create();

const cmd = await sandbox.runCommand("echo", ["Hello from Vercel Sandbox!"]);
console.log(await cmd.stdout());

await sandbox.stop();
