#!/bin/bash

# Script: snapshot.sh
# Purpose: Generate project snapshots with tree structure and file contents
# Usage: ./snapshot.sh [client|server|both]

set -e

# Parameters
MODE="${1:-both}"   # default to “both” if no argument given

# Directory where snapshots are saved
SNAPSHOT_DIR="snapshots"

# A single timestamp (YYYYMMDD_HHMMSS) for this run
TIMESTAMP="$(date "+%Y%m%d_%H%M%S")"

# Final snapshot file (no “mode” in its name; only timestamp)
OUTPUT_FILE="${SNAPSHOT_DIR}/snapshot_${TIMESTAMP}.txt" # Added .txt extension for clarity

# A list of comma-separated patterns for `tree -I` (exclude from the printed tree)
# – exclude node_modules, snapshots, publish, env, config, Docker, tsconfig, client/public, server/data, git, and common build artifacts
EXCLUDE_TREE_PATTERN="node_modules|snapshots|publish|\.git|.venv|venv|env|ENV|\.env|README\.md|\.gitignore|package\.json|package-lock\.json|yarn\.lock|pnpm-lock\.yaml|Gemfile\.lock|poetry\.lock|Dockerfile|docker-compose\.yml|docker-compose\.yaml|tsconfig\.json|tsconfig\.[^/.]+\.json|client/public|server/data|\.DS_Store|dist|build|coverage|logs|\.log|\.min\.js|\.min\.css|\.cache|tmp|temp|\.(swp|swo|lock)|\.(png|jpg|jpeg|gif|svg|ico|webp|eot|ttf|woff|woff2)|\.(mp3|wav|ogg|mp4|avi|mov|mkv|webm)|\.(pdf|doc|docx|xls|xlsx|ppt|pptx|odt|ods|odp)|\.(zip|tar|gz|bz2|rar|7z|iso|img|bin|exe|dll|so|dylib)|\.(db|sqlite|sqlite3|mdb|accdb)|\.(yml|yaml)|.*\.config\.(js|ts|json|cjs|mjs)"

# Ensure snapshots directory exists
mkdir -p "$SNAPSHOT_DIR"

# Validate mode
case "$MODE" in
  client|server|both)
    ;;
  -h|--help|help)
    echo "Usage: $0 [client|server|both]"
    echo "  client: Snapshot only the 'client' directory."
    echo "  server: Snapshot only the 'server' directory."
    echo "  both:   Snapshot the entire project recursively from the root (default)."
    exit 0
    ;;
  *)
    echo "Error: invalid argument '$MODE'"
    echo "Usage: $0 [client|server|both]"
    exit 1
    ;;
esac

{
  echo "========================================="
  echo "PROJECT SNAPSHOT – $(echo "$MODE" | tr '[:lower:]' '[:upper:]')"
  echo "Generated: $(date)"
  echo "========================================="
  echo
  echo "PROJECT STRUCTURE:"
  echo

  # Print tree with exclusions
  case "$MODE" in
    client)
      if [[ -d "client" ]]; then
        tree client -I "$EXCLUDE_TREE_PATTERN" || true
      else
        echo "Error: client/ folder not found in the current directory ($(pwd))." >&2
        # No exit 1 here to allow potential partial snapshot if cat_text_files also handles it
      fi
      ;;
    server)
      if [[ -d "server" ]]; then
        tree server -I "$EXCLUDE_TREE_PATTERN" || true
      else
        echo "Error: server/ folder not found in the current directory ($(pwd))." >&2
      fi
      ;;
    both)
      tree . -I "$EXCLUDE_TREE_PATTERN" || true
      ;;
  esac

  echo
  echo "========================================="
  echo "FILE CONTENTS"
  echo "========================================="
  echo

  # Function to decide whether to skip a file path
  should_skip_file() {
    local filepath="$1"

    # Exclude common directories by path
    # Exclude common directories by path (ensure trailing slash for directories)
    [[ "$filepath" == *"/snapshots/"* ]] && return 0
    [[ "$filepath" == *"/node_modules/"* ]] && return 0
    [[ "$filepath" == *"/publish/"* ]] && return 0
    [[ "$filepath" == *"/client/public/"* ]] && return 0
    [[ "$filepath" == *"/server/data/"* ]] && return 0
    [[ "$filepath" == *"/coverage/"* ]] && return 0
    [[ "$filepath" == *"/dist/"* ]] && return 0
    [[ "$filepath" == *"/build/"* ]] && return 0
    [[ "$filepath" == *"/tmp/"* ]] && return 0
    [[ "$filepath" == *"/temp/"* ]] && return 0
    [[ "$filepath" == *".git/"* ]] && return 0
    [[ "$filepath" == *".cache/"* ]] && return 0
    [[ "$filepath" == *".venv/"* ]] && return 0
    [[ "$filepath" == *"venv/"* ]] && return 0 # Covers project_root/venv/
    [[ "$filepath" == *"env/"* ]] && return 0  # Covers project_root/env/
    [[ "$filepath" == *"ENV/"* ]] && return 0  # Covers project_root/ENV/
    [[ "$filepath" == *"logs/"* ]] && return 0

    # Exclude specific filenames or patterns (basename)
    local filename
    filename=$(basename "$filepath")

    [[ "$filename" =~ ^\.env(\..*)?$ ]] && return 0 # .env, .env.local, .env.production etc.
    [[ "$filename" == "package.json" ]] && return 0
    [[ "$filename" == "package-lock.json" ]] && return 0
    [[ "$filename" == "yarn.lock" ]] && return 0
    [[ "$filename" == "pnpm-lock.yaml" ]] && return 0
    [[ "$filename" == "Gemfile.lock" ]] && return 0
    [[ "$filename" == "poetry.lock" ]] && return 0

    [[ "$filename" == "Dockerfile" ]] && return 0
    [[ "$filename" == "docker-compose.yml" ]] && return 0
    [[ "$filename" == "docker-compose.yaml" ]] && return 0

    [[ "$filename" == "tsconfig.json" ]] && return 0
    [[ "$filename" =~ ^tsconfig\.[^/.]+\.json$ ]] && return 0 # tsconfig.base.json, tsconfig.app.json, etc.

    # README.md is often useful, so not excluding by default here.
    # [[ "$filename" == "README.md" ]] && return 0
    [[ "$filename" == ".gitignore" ]] && return 0
    [[ "$filename" == ".gitattributes" ]] && return 0
    [[ "$filename" == ".editorconfig" ]] && return 0
    [[ "$filename" == ".prettierrc" ]] && return 0
    [[ "$filename" == ".eslintrc.js" ]] && return 0 # Example common config files
    [[ "$filename" == ".babelrc" ]] && return 0

    # Exclude by extension or specific naming patterns
    [[ "$filepath" =~ \.config\.(js|ts|json|cjs|mjs)$ ]] && return 0 # e.g. vite.config.js
    [[ "$filepath" =~ \.(yml|yaml)$ ]] && return 0 # All YAML files (often config)

    [[ "$filepath" =~ \.log$ ]] && return 0
    [[ "$filename" == ".DS_Store" ]] && return 0
    [[ "$filepath" =~ \.min\.(js|css)$ ]] && return 0

    # Exclude binary/media by extension
    [[ "$filepath" =~ \.(swp|swo|lock)$ ]] && return 0 # Editor temp/lock files
    [[ "$filepath" =~ \.(png|jpg|jpeg|gif|svg|ico|webp|eot|ttf|woff|woff2)$ ]] && return 0 # Images & Fonts
    [[ "$filepath" =~ \.(mp3|wav|ogg|mp4|avi|mov|mkv|webm)$ ]] && return 0 # Audio/Video
    [[ "$filepath" =~ \.(pdf|doc|docx|xls|xlsx|ppt|pptx|odt|ods|odp)$ ]] && return 0 # Documents
    [[ "$filepath" =~ \.(zip|tar|gz|bz2|rar|7z|iso|img|bin|exe|dll|so|dylib)$ ]] && return 0 # Archives & Binaries
    [[ "$filepath" =~ \.(db|sqlite|sqlite3|mdb|accdb)$ ]] && return 0 # Databases

    return 1
  }

  # Function to cat text-based files under a base directory
  cat_text_files() {
    local base_dir="$1"
    
    if [[ ! -d "$base_dir" ]]; then
      echo "Warning: Directory '$base_dir' not found for catting files." >&2
      return
    fi

    # Use find relative to the base_dir, but print paths relative to project root
    # To do this, we cd into base_dir, find, and then prepend base_dir if it's not '.'
    local initial_pwd="$PWD"
    cd "$base_dir" || { echo "Error: Could not cd to '$base_dir'" >&2; return 1; }

    # Find files, excluding .git explicitly in find as well to be safe and efficient
    # The sort ensures a consistent order
    find . -path './.git' -prune -o -type f -print | sort | while IFS= read -r relative_file; do
      # Remove leading ./
      relative_file="${relative_file#./}"
      # Construct full path from original PWD for should_skip_file and output
      local full_filepath
      if [[ "$base_dir" == "." ]]; then
        full_filepath="$relative_file"
      else
        full_filepath="${base_dir%/}/$relative_file" # Ensure single slash
      fi
      
      # Normalize path for should_skip_file (e.g. remove duplicate slashes)
      full_filepath_normalized=$(echo "$full_filepath" | sed 's#//#/#g')


      if should_skip_file "$full_filepath_normalized"; then
        continue
      fi
      
      # Simplified text file detection: prioritize common text extensions, then fallback to `file` command.
      local is_text_file=false
      # Allowlist of common text file extensions
      case "$full_filepath_normalized" in
        *.txt|*.md|*.json|*.xml|*.html|*.css|*.scss|*.sass|*.js|*.jsx|*.ts|*.tsx|*.vue|*.svelte|*.py|*.rb|*.pl|*.php|*.sh|*.bash|*.zsh|*.fish|*.c|*.cpp|*.h|*.hpp|*.java|*.go|*.rs|*.swift|*.kt|*.kts|*.cs|*.fs|*.fsi|*.fsx|*.fsscript|*.sql|*.csv|*.tsv|*.ini|*.toml|*.cfg|*.conf|*.properties|*.editorconfig|*.lock|*.yaml|*.yml|*.http|*.rest|*.graphql|*.gql|*.tf|*.tfvars|*.hcl|*.mod|*.sum|*.gradle|*.kts|*.gd|*.gdshader|*.glsl|*.vert|*.frag|*.comp|*.gitignore|*.gitattributes|*.dockerignore|*.npmignore|*.babelrc|*.eslintrc|*.prettierrc|*.stylelintrc|*.browserslistrc|*.nvmrc|*.env.example|*.envrc|*.ps1|*.psm1|*.psd1|*.ps1xml|*.psc1|*.pssc|*.cdxml|*.xaml|*.csproj|*.vbproj|*.fsproj|*.sln|*.props|*.targets|*.user|*.config|*.settings|*.resx|*.asax|*.ascx|*.ashx|*.asmx|*.aspx|*.cshtml|*.vbhtml|*.master|*.razor|*.jsxbin)
          is_text_file=true
          ;;
        *)
          # Fallback to `file` command for other extensions or no extension
          if command -v file >/dev/null && file_output=$(file -b --mime-type "$initial_pwd/$full_filepath_normalized" 2>/dev/null); then
            if [[ "$file_output" == text/* || \
                  "$file_output" == application/json || \
                  "$file_output" == application/xml || \
                  "$file_output" == application/xhtml+xml || \
                  "$file_output" == application/javascript || \
                  "$file_output" == application/typescript || \
                  "$file_output" == application/x-sh || \
                  "$file_output" == application/x-shellscript || \
                  "$file_output" == application/x-python || \
                  "$file_output" == application/x-ruby || \
                  "$file_output" == application/x-perl || \
                  "$file_output" == application/x-php || \
                  "$file_output" == application/x-csh || \
                  "$file_output" == application/x-wine-extension-ini || \
                  "$file_output" == "inode/x-empty" || \
                  "$file_output" == "application/x-empty" ]]; then
              is_text_file=true
            else
              # Optional: Log skipped binary files based on MIME type
              # echo "Skipping binary or non-text file (MIME: $file_output): $full_filepath_normalized" >&2
              :
            fi
          else
            echo "Warning: 'file' command not found or failed for $initial_pwd/$full_filepath_normalized. Assuming text based on extension or lack thereof." >&2
            # If file command fails, we might still proceed if it wasn't caught by binary extension check in should_skip_file
            is_text_file=true # Or set to false to be more conservative
          fi
          ;;
      esac

      if ! $is_text_file; then
        continue
      fi
      
      echo "----------------------------------------"
      echo "File: $full_filepath_normalized" # Use normalized path for display
      echo "----------------------------------------"
      if [[ -s "$initial_pwd/$full_filepath_normalized" ]]; then # Check if file is not empty
        cat "$initial_pwd/$full_filepath_normalized"
      else
        echo "(empty file)"
      fi
      echo # Add a newline for spacing after file content
      echo # Add another for more spacing
    done
    cd "$initial_pwd" || { echo "Error: Could not cd back to '$initial_pwd'" >&2; exit 1; } # Return to original directory
  }

  case "$MODE" in
    client)
      cat_text_files "client"
      ;;
    server)
      cat_text_files "server"
      ;;
    both)
      # Cat all text files recursively from the project root (.)
      # subject to exclusions in should_skip_file and text file check.
      cat_text_files "."
      ;;
  esac

} > "$OUTPUT_FILE"

echo "Snapshot created: $OUTPUT_FILE"