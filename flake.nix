{
  description = "Chorder flake";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    flake-utils.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs = { nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachSystem [ "x86_64-linux" ] (system:
      let pkgs = nixpkgs.legacyPackages.${system};
      in {
        packages.default = with pkgs;
          rustPlatform.buildRustPackage rec {
            pname = "chorder";
            version = "0.1.3";

            src = ./.;

            postPatch = lib.optionalString stdenv.hostPlatform.isLinux ''
              substituteInPlace $cargoDepsCopy/libappindicator-sys-*/src/lib.rs \
                --replace "libayatana-appindicator3.so.1" "${libayatana-appindicator}/lib/libayatana-appindicator3.so.1"
            '';

            useFetchCargoVendor = true;

            npmDeps = importNpmLock { npmRoot = ./.; };
            npmConfigHook = importNpmLock.npmConfigHook;

            buildInputs = [ openssl ]
              ++ lib.optionals stdenv.hostPlatform.isLinux [
                dbus
                freetype
                gsettings-desktop-schemas
                libayatana-appindicator
                webkitgtk_4_1
              ];
            nativeBuildInputs = [
              cargo-tauri.hook
              nodejs_22
              importNpmLock.npmConfigHook
              pkg-config
              wrapGAppsHook4
            ];
            cargoHash = "sha256-Yua4Qx0HSXMWjFxZcRpmTZ5MGtO+F8+2xtIBz8Hg+Jc=";
            cargoRoot = "src-tauri";
            buildAndTestSubdir = cargoRoot;

            preBuild = ''
              npm run build
            '';

            doCheck = false;

            meta = with lib; {
              homepage = "";
              description = "Chorder";
              license = licenses.mit;
              mainProgram = "chorder";
            };
          };
      });
}
