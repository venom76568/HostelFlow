import secrets
import string

def generate_student_id(college_name: str) -> str:
    """
    Generates a custom student ID formatted as PREFIX-SUFFIX.
    - Prefix: First 4 chars of college_name (no spaces, uppercase, padded with 'X').
    - Suffix: 6-character random alphanumeric string.
    """
    if not college_name:
        college_name = "UNKN"
        
    # 1. Remove spaces and convert to uppercase
    clean_name = college_name.replace(" ", "").upper()
    
    # 2. Extract first 4 characters
    prefix = clean_name[:4]
    
    # 3. Pad with 'X' if the prefix is shorter than 4 characters
    prefix = prefix.ljust(4, 'X')
    
    # 4. Generate random 6-character alphanumeric suffix
    alphabet = string.ascii_uppercase + string.digits
    suffix = ''.join(secrets.choice(alphabet) for _ in range(6))
    
    # 5. Combine with a hyphen
    return f"{prefix}-{suffix}"
