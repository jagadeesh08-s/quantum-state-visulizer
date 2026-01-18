import re

with open('ibm_service.py', 'r') as f:
    content = f.read()

# Fix print(f"...", key=val, ...) which is invalid
# I'll just replace them with multiple args or fixed f-string
def fix_print(match):
    msg = match.group(1)
    args = match.group(2)
    # Convert key=val to key={val}
    fixed_args = re.sub(r'(\w+)=([^,)]+)', r'\1={\2}', args)
    return f'print(f"{msg}: {fixed_args}")'

content = re.sub(r'print\(f?"([^"]+)",\s*([^)]+)\)', fix_print, content)

with open('ibm_service.py', 'w') as f:
    f.write(content)
