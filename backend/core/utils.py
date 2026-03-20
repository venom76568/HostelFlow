import secrets
import string

def generate_student_id(college_name: str) -> str:
    """
    Generates a custom student ID formatted as PREFIX-SUFFIX.
    - Prefix: First 4 chars of college_name (no spaces, uppercase, padded with 'X').
    - Suffix: 6-character random alphanumeric string.
    """
    # Fallback for empty or None input
    if not college_name or not college_name.strip():
        college_name = "UNKN"
        
    # 1. Remove spaces and convert to uppercase
    clean_name = "".join(college_name.split()).upper()
    
    # 2. Extract prefix and handle padding in one go
    # We take the first 4, then pad to 4 if it's shorter
    prefix = clean_name[:4].ljust(4, 'X')
    
    # 3. Generate random 6-character alphanumeric suffix
    # Using string.ascii_uppercase + string.digits for the random part
    alphabet = string.ascii_uppercase + string.digits
    suffix = ''.join(secrets.choice(alphabet) for _ in range(6))
    
    # 4. Combine with a hyphen
    return f"{prefix}-{suffix}"

# Test cases:
# "Pune College" -> PUNE-A1B2C3
# "IIT"          -> IITX-X9Y8Z7
# " "            -> UNKN-123456