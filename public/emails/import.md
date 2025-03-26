
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

## Troubleshooting Repository Files

If your files aren't appearing in the repository dropdown:

1. Make sure they're placed in the `/public/emails/` directory directly (not in subdirectories)
2. Verify the files have a `.csv` or `.json` extension
3. File names should not contain special characters
4. Try clicking the "Refresh Data" button on the import page
5. Enable the diagnostic panel to see detailed logs
6. Try the "Check Paths" button to validate file accessibility
7. If automatic detection fails, use the "Manual URL" tab and enter the full path to your file (e.g., `https://your-domain.com/emails/your_file.csv`)
8. Check if you can access the file directly in your browser at `/emails/your_file.csv`
