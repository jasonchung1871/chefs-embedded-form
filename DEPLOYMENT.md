# CHEFS Embedded Form - Deployment Guide

This project creates a static HTML website that embeds a CHEFS form using FormIO renderer.

## 🚀 Quick Deployment

### 1. Configure Environment

Copy the environment template and fill in your values:

```bash
# Copy the template
cp env-template.txt .env

# Edit .env with your actual values
# Required variables:
# - VITE_CHEFS_BASE_URL
# - VITE_CHEFS_BASE_PATH
# - VITE_API_FORM_ID  
# - VITE_API_FORM_VERSION_ID
```

### 2. Build Static Site

```bash
# Install dependencies
npm install

# Build for production
npm run build
```

### 3. Deploy

The built files will be in the `dist/` folder. Deploy this folder to any static hosting service:

- **Netlify**: Drag and drop the `dist` folder
- **Vercel**: Connect your GitHub repo
- **GitHub Pages**: Upload `dist` contents to your repo
- **AWS S3**: Upload `dist` contents to S3 bucket
- **Any web server**: Copy `dist` contents to web root

## 🔧 Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_CHEFS_BASE_URL` | CHEFS API base URL | `https://submit.digital.gov.bc.ca` |
| `VITE_CHEFS_BASE_PATH` | CHEFS API base path | `/app/api/v1` |
| `VITE_API_FORM_ID` | Your form ID (UUID) | `aeb3b705-1de5-4f4e-a4e6-0716b7671034` |
| `VITE_API_FORM_VERSION_ID` | Form version ID (UUID) | `a675ab2a-1e88-4fb5-88f9-c7cb051a18b2` |

### Getting Form Details

1. **Form ID**: Found in your CHEFS form URL or admin panel
2. **Form Version ID**: Available in the form version management
3. **API Key**: Generate via CHEFS admin panel for your form

## 🛠️ Development

### Local Development

```bash
# Start development server
npm run dev
```

## 📁 Project Structure

```
src/
├── components/
│   ├── EmbeddedForm.vue      # Production form component
│   ├── FormModuleTester.vue  # Development testing tools
│   └── ApiKeyGenerator.vue   # API key helper
├── composables/
│   └── useFormModules.js     # Form data management
├── services/
│   └── api.js                # CHEFS API client
├── config/
│   └── index.js              # Environment configuration
└── App.vue                   # Main application
```

## 🔒 Security Notes

- **Never commit `.env` files** - they contain sensitive API keys
- **Use HTTPS** for production deployments
- **Validate environment variables** before building
- **Consider API key rotation** for production use

## 📦 Build Output

The build process creates:
- `dist/index.html` - Main HTML file
- `dist/assets/` - Bundled JS/CSS files
- Source maps for debugging (if enabled)

## 🌐 Production Considerations

1. **CORS**: Ensure your CHEFS API allows requests from your domain
2. **API Limits**: Monitor API usage and implement rate limiting if needed
3. **Error Handling**: The form includes automatic retry and error display
4. **Loading States**: Users see progress indicators during form loading
5. **Mobile Responsive**: Form adapts to different screen sizes

## 🤝 Support

For CHEFS-specific issues, consult the CHEFS documentation or support channels.
For this embedded form implementation, check the debug tools and browser console for error details.
