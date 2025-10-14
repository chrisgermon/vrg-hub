# TinaCMS Integration Guide

CrowdHub now includes TinaCMS, a Git-based visual content editor built directly into the application.

## Features

- **Visual Editing**: Edit content directly with a WYSIWYG editor
- **Git-Based**: All changes are version controlled
- **Media Management**: Upload and manage images and files
- **Custom Pages**: Create and edit custom content pages
- **Home Page Editing**: Modify hero sections, quick links, and more

## Getting Started

### 1. Access the Content Editor

Navigate to `/content-editor` in your CrowdHub application (available for Tenant Admins and Super Admins).

### 2. Edit Content

1. Click "Open TinaCMS Editor" to launch the visual editor
2. Navigate to the content you want to edit
3. Make your changes using the rich-text editor
4. Save your changes

### 3. View Changes

Changes are automatically reflected in your application after saving.

## Configuration

TinaCMS is configured via `tina/config.ts`. You can customize:

- Content collections (pages, home page, etc.)
- Field types and validation
- Media storage settings
- Branch and repository settings

## Content Structure

### Home Page
Located at `content/home.json`, editable fields include:
- Hero title and subtitle
- Hero background image
- Quick links with icons and URLs

### Custom Pages
Stored in `content/pages/` as MDX files with:
- Title and description
- Rich-text body content
- Custom metadata

## Development

### Local Development
TinaCMS works seamlessly in local development. Just run your dev server and access the content editor.

### Production
For production use with TinaCMS Cloud:
1. Sign up at [tina.io](https://tina.io)
2. Connect your GitHub repository
3. Add your credentials to environment variables:
   - `VITE_TINA_CLIENT_ID`
   - `VITE_TINA_TOKEN`

## CLI Commands

```bash
# Start TinaCMS dev server (optional)
npx tinacms dev -c "npm run dev"

# Build TinaCMS admin
npx tinacms build
```

## Benefits Over Plasmic

- **Git-Based**: All content changes are tracked in version control
- **No External Dependencies**: Works entirely within CrowdHub
- **Developer Friendly**: Content stored as JSON/MDX files
- **Flexible**: Easy to customize content models
- **Self-Hosted**: No external service required for basic functionality

## Learn More

- [TinaCMS Documentation](https://tina.io/docs/)
- [TinaCMS GitHub](https://github.com/tinacms/tinacms)
- [TinaCMS Discord Community](https://discord.com/invite/zumN63Ybpf)
