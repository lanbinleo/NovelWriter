#!/usr/bin/env python3
import json
import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

# Configure the data directories
LOCAL_DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
LOCAL_BOOKS_DIR = os.path.join(LOCAL_DATA_DIR, 'books')

# GitHub repository data URLs
GITHUB_DATA_BASE = "https://raw.githubusercontent.com/lanbinleo/NovelWriter/main/data"
GITHUB_BOOK_LIST = f"{GITHUB_DATA_BASE}/bookList.json"
GITHUB_BOOKS_DIR = f"{GITHUB_DATA_BASE}/books"

# Ensure local data directories exist
os.makedirs(LOCAL_DATA_DIR, exist_ok=True)
os.makedirs(LOCAL_BOOKS_DIR, exist_ok=True)

REMOTE = True
if REMOTE:
    DATA_DIR = GITHUB_DATA_BASE
    BOOKS_DIR = GITHUB_BOOKS_DIR

class NovelWriterHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # Handle API requests
        if self.path.startswith('/api/'):
            self.handle_api_request()
        else:
            # Default behavior for serving static files
            super().do_GET()
    
    def do_POST(self):
        # Handle POST requests (save data)
        if self.path.startswith('/api/'):
            self.handle_api_request()
        else:
            self.send_error(404)
    
    def do_DELETE(self):
        # Handle DELETE requests
        if self.path.startswith('/api/'):
            self.handle_api_request()
        else:
            self.send_error(404)
    
    def handle_api_request(self):
        # Parse the path to determine the API endpoint
        url_parts = urlparse(self.path)
        path = url_parts.path
        
        # Handle specific API endpoints
        if path == '/api/save-book-list':
            self.handle_save_book_list()
        elif path == '/api/save-book':
            self.handle_save_book()
        elif path == '/api/delete-book':
            self.handle_delete_book(url_parts.query)
        else:
            self.send_error(404, "API endpoint not found")
    
    def handle_save_book_list(self):
        # Read request body
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            # Parse JSON data
            book_list = json.loads(post_data.decode('utf-8'))
            
            # Save to bookList.json
            with open(os.path.join(LOCAL_DATA_DIR, 'bookList.json'), 'w', encoding='utf-8') as f:
                json.dump(book_list, f, ensure_ascii=False, indent=2)
            
            # Send success response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': True}).encode('utf-8'))
        
        except Exception as e:
            # Send error response
            self.send_error(500, str(e))
    
    def handle_save_book(self):
        # Read request body
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            # Parse JSON data
            book = json.loads(post_data.decode('utf-8'))
            
            # Validate book data
            if 'id' not in book or 'title' not in book:
                raise ValueError("Book data must contain 'id' and 'title'")
            
            # Save book to JSON file
            book_path = os.path.join(LOCAL_BOOKS_DIR, f"{book['id']}.json")
            with open(book_path, 'w', encoding='utf-8') as f:
                json.dump(book, f, ensure_ascii=False, indent=2)
            
            # Send success response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': True}).encode('utf-8'))
        
        except Exception as e:
            # Send error response
            self.send_error(500, str(e))
    
    def handle_delete_book(self, query_string):
        try:
            # Parse query parameters
            query_params = parse_qs(query_string)
            
            # Get book ID
            book_id = query_params.get('id', [''])[0]
            
            if not book_id:
                raise ValueError("Missing book ID")
            
            # Delete book file if it exists
            book_path = os.path.join(LOCAL_BOOKS_DIR, f"{book_id}.json")
            if os.path.exists(book_path):
                os.remove(book_path)
            
            # Send success response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': True}).encode('utf-8'))
        
        except Exception as e:
            # Send error response
            self.send_error(500, str(e))

def run_server(port=8000):
    server_address = ('0.0.0.0', port)
    httpd = HTTPServer(server_address, NovelWriterHandler)
    print(f"Starting server on http://localhost:{port}")
    httpd.serve_forever()

if __name__ == "__main__":
    # Get port from command line arguments or use default
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    run_server(port)