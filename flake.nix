{
  description = "ocr-cam dev environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_22
            caddy
            python3
            qrencode
            openssl
          ];

          shellHook = ''
            echo "ocr-cam dev shell"
            echo "  caddy:    $(caddy version)"
            echo "  node:     $(node --version)"
            echo "  python:   $(python3 --version)"
            echo "  qrencode: $(qrencode --version 2>&1 | head -1)"
            echo ""
            echo "Run 'npm run dev' to start the dev server with HTTPS + cross-origin isolation."
          '';
        };
      });
}
