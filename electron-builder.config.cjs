module.exports = {
  appId: "com.beefro.desktop",
  productName: "Lain Leaks",
  directories: {
    output: "release",
  },
  files: [
    "dist/**/*",
    "dist-electron/**/*",
    "package.json",
  ],
  asar: true,
  publish: [{
    provider: "generic",
    url: "https://github.com/daqdaq933-arch/lain-leaks-updates/releases/latest/download/",
  }],
  win: {
    target: ["nsis"],
    artifactName: "Lain-Leaks-${version}-win-${arch}.${ext}",
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowElevation: true,
    allowToChangeInstallationDirectory: true,
  },
  mac: {
    target: ["dmg", "zip"],
    artifactName: "${productName}-${version}-mac-${arch}.${ext}",
    category: "public.app-category.utilities",
    notarize: true,
  },
  linux: {
    target: ["AppImage"],
    artifactName: "${productName}-${version}-linux-${arch}.${ext}",
    category: "Utility",
  },
};
