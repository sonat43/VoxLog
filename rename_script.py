import os
import re

def inplace_replace(dir_path):
    # Mapping for safe replacement
    mapping = {
        'Courses': '___Programs___',
        'courses': '___programs___',
        'Course': '___Program___',
        'course': '___program___',
        'COURSE': '___PROGRAM___',
        
        'Subjects': 'Courses',
        'subjects': 'courses',
        'Subject': 'Course',
        'subject': 'course',
        'SUBJECT': 'COURSE'
    }
    
    final_mapping = {
        '___Programs___': 'Programs',
        '___programs___': 'programs',
        '___Program___': 'Program',
        '___program___': 'program',
        '___PROGRAM___': 'PROGRAM'
    }

    for root, dirs, files in os.walk(dir_path):
        for file in files:
            if file.endswith(('.js', '.jsx', '.html')):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                original = content
                
                # Phase 1: course -> temp, subject -> course
                for k, v in mapping.items():
                    # We use simple string replace since we want to catch substrings like courseId
                    content = content.replace(k, v)
                    
                # Phase 2: temp -> program
                for k, v in final_mapping.items():
                    content = content.replace(k, v)
                    
                if original != content:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(content)
                    print(f"Updated {filepath}")

inplace_replace('src')
