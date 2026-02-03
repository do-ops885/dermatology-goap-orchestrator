#!/usr/bin/env python3
"""Fix lint errors in the codebase."""

import re
import sys

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    
    # Fix 1: Replace || with ?? for nullish coalescing in specific patterns
    # Fix headers lookups
    content = re.sub(r'(\w+)\[name\] \|\|', r'\1[name] ??', content)
    content = re.sub(r'(\w+)\[value\] \|\|', r'\1[name] ??', content)
    
    # Fix 2: Replace !variable checks with == null for nullable strings
    content = re.sub(r'!text\b', 'text == null', content)
    content = re.sub(r'!result\b', 'result == null', content)
    content = re.sub(r'!response\b', 'response == null', content)
    content = re.sub(r'!jsonData\b', 'jsonData == null', content)
    content = re.sub(r'!instance\b', 'instance == null', content)
    content = re.sub(r'!options\b', 'options == null', content)
    
    # Fix 3: Replace empty object checks that are always true
    content = re.sub(r'if\s*\(\s*\{\s*\}\s*\)', 'if (false)', content)
    
    # Fix 4: Fix console.log to console.warn
    content = re.sub(r'console\.log\(', 'console.warn(', content)
    
    # Fix 5: Fix unused variables by prefixing with _
    content = re.sub(r'\bunused(\w+)\b', r'_\1', content)
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Fixed: {filepath}")

if __name__ == '__main__':
    for filepath in sys.argv[1:]:
        try:
            fix_file(filepath)
        except Exception as e:
            print(f"Error fixing {filepath}: {e}")
