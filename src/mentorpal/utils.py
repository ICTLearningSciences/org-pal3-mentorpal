
'''
Strips leading and ending whitespace and non-alphanumeric characters
Returns sanitized string.
'''
def sanitize_string(InputString):
    InputString = InputString.strip()
    InputString = InputString.lower()
    InputString = InputString.replace('\u00a0',' ')
    InputString = extract_alphanumeric(InputString)
    return InputString

def extract_alphanumeric(InputString):
    from string import ascii_letters, digits, whitespace
    return "".join([ch for ch in InputString if ch in (ascii_letters + digits + whitespace)])

def normalize_topics(topics):
    ret_topics=[]
    for topic in topics:
        topic=topic.strip()
        topic=topic.lower()
        ret_topics.append(topic)
    return ret_topics