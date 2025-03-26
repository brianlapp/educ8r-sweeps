
# Email Migration Repository

This folder contains chunked email subscriber data files for importing into the system. 
Files in this repository will be automatically detected by the email migration system and can be imported directly from the admin interface.

## File Format

Files can be in either CSV or JSON format, and should follow these guidelines:

- **CSV Files**: Should include headers with at least an 'email' column. 'first_name' and 'last_name' columns are also recognized.
- **JSON Files**: Should contain an array of objects with at least an 'email' property. 'first_name' and 'last_name' properties are also recognized.

## Chunking

Files are automatically processed in smaller batches (50 subscribers per chunk) for reliability and to respect API rate limits.

## File Location Requirements

It's **critically important** that files be placed in:
- `/public/emails/` directory (not in subdirectories)
- Files should have `.csv` or `.json` extension 

## Naming Convention

It's recommended to name files with a descriptive format such as:
- `chunk_aa.csv` - First chunk
- `chunk_ab.csv` - Second chunk
- etc.

## Importing

To import these files:
1. Go to the Email Migration admin page
2. Use the "Repository Import" tab
3. Select a file from the dropdown list
4. Click "Import" to start the process

## Direct Import Command

If the repository dropdown isn't displaying files, you can use the Direct Import button 
with a specific filename (e.g., "chunk_ac.csv"). The system will load this file directly
from the /public/emails/ directory and import it.

## Troubleshooting Repository Files

If your files aren't appearing in the repository dropdown:

1. **File Location**: Make sure files are in `/public/emails/` directory (not in subdirectories)
2. **File Extensions**: Files must have `.csv` or `.json` extension
3. **File Naming**: Use simple names without special characters, ideally following the pattern `chunk_xx.csv`
4. **Refresh**: Try clicking the "Repository Files" tab again to refresh the file list
5. **URL Access Test**: Verify you can access a file directly in your browser at `/emails/your_file.csv`
6. **Manual URL Import**: If automatic detection fails, use the "URL Import" tab with the full URL to your file (e.g., `https://your-domain.com/emails/your_file.csv`)
7. **HTTP vs HTTPS**: Make sure URLs match your site's protocol (HTTP or HTTPS)
8. **Deployment**: Files must be deployed with your site - local files won't be accessible
9. **Clear Cache**: Sometimes browsers cache old data - try clearing your cache
10. **Check Logs**: Check browser console logs for any errors related to file access

## Common File Issues

- **Encoding**: Files should be UTF-8 encoded to handle special characters
- **Quotes**: Some CSV files use quotes around fields which may cause parsing issues
- **Empty Lines**: Blank lines at the end of CSV files can cause parsing issues
- **Commas in Fields**: If fields contain commas, they should be properly quoted
- **Large Files**: Files >5MB may cause performance issues - split into smaller chunks
