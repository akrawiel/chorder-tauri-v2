{
  description = "Chorder flake";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    flake-utils.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs = { nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachSystem [ "x86_64-linux" ] (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        packages.default = with pkgs;
          rustPlatform.buildRustPackage rec {
            pname = "chorder";
            version = "0.1.3";

            src =  ./.;

            npmDeps = importNpmLock { npmRoot = ./.; };

            buildInputs = [ openssl ]
              ++ lib.optionals stdenv.hostPlatform.isLinux [ webkitgtk_4_1 ];
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

            meta = with lib; {
              homepage = "";
              description = "Chorder";
              license = licenses.mit;
              mainProgram = "chorder";
            };
          };
      });
}
