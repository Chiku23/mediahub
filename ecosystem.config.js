// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "MEDIAHUB-auth",
      cwd: "./services/auth",
      script: "index.js",
      exec_mode: "fork",
      watch: false,
      env: {
        NODE_ENV: "development",
      }
    },
    {
      name: "MEDIAHUB-upload",
      cwd: "./services/upload",
      script: "index.js",
      exec_mode: "fork",
      watch: false,
      env: {
        NODE_ENV: "development",
      }
    },
    {
      name: "MEDIAHUB-media",
      cwd: "./services/media",
      script: "index.js",
      exec_mode: "fork",
      watch: false,
      env: {
        NODE_ENV: "development",
      }
    },
    {
      name: "MEDIAHUB-metadata",
      cwd: "./services/metadata",
      script: "index.js",
      exec_mode: "fork",
      watch: false,
      env: {
        NODE_ENV: "development",
      }
    },
    {
      name: "MEDIAHUB-thumbnail",
      cwd: "./services/thumbnail",
      script: "index.js",
      exec_mode: "fork",
      watch: false,
      env: {
        NODE_ENV: "development",
      }
    },
    {
      name: "MEDIAHUB-transcoder",
      cwd: "./services/transcoder",
      script: "index.js",
      exec_mode: "fork",
      watch: false,
      env: {
        NODE_ENV: "development",
      }
    }
  ]
};
