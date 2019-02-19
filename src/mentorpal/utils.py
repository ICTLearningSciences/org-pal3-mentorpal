
'''
Strips leading and ending whitespace and non-alphanumeric characters
Returns sanitized string.
'''
def SanitizeString(InputString):
    InputString = InputString.strip()
    InputString = InputString.lower()
    InputString = InputString.replace('\u00a0',' ')
    InputString = ExtractAlphanumeric(InputString)
    return InputString

def ExtractAlphanumeric(InputString):
    from string import ascii_letters, digits, whitespace
    return "".join([ch for ch in InputString if ch in (ascii_letters + digits + whitespace)])