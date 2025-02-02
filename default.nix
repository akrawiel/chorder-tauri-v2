{
  lib,
  stdenv,
  rustPlatform,
  importNpmLock,
  cargo-tauri,
  nodejs_22,
  npmHooks,
  openssl,
  pkg-config,
  webkitgtk_4_1,
  wrapGAppsHook4,
  gitignoreSource,
}:

rustPlatform.buildRustPackage rec {
  pname = "chorder";
  version = "0.1.3";

  src = gitignoreSource ./.;

  npmDeps = importNpmLock {
    npmRoot = ./.;
  };

  buildInputs = [ openssl ]
    ++ lib.optionals stdenv.hostPlatform.isLinux [
      webkitgtk_4_1
    ];
  nativeBuildInputs = [ 
    cargo-tauri.hook
    nodejs_22
    npmHooks.npmConfigHook
    pkg-config
    wrapGAppsHook4
  ];
  cargoSha256 = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
  cargoRoot = "src-tauri";
  buildAndTestSubdir = cargoRoot;

  meta = with stdenv.lib; {
    homepage = "";
    description = "Chorder";
    license = licenses.mit;
  };
}
