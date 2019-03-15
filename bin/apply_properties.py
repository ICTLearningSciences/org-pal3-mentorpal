
"""
apply_properties:

Tool takes a properties file and a set of target files
that may have property placeholder strings
and replaces each instance of a defined property placeholder string
with the value from the properties file.

By default, property placeholder strings in target files
are expected to have this format: {{PROP_NAME}}

Usage:
   python apply_properties.py props_file tgt_1, tgt_2, ...

   or

   python apply_properties.py props_file glob_exp

   ...where glob_exp like /path/*.yml
"""

from glob import glob
from os.path import isfile
import sys
import base64

def load_props(filepath, sep='=', comment_char='#'):
    """
    Read the file passed as parameter as a properties file.

    Why not use ConfigParser? Because for now
    trying to avoid requiring python modules (or a conda env)
    for running the build process. 
    We are assuming users have python, but that will
    be true out of the box for OSX and Ubuntu.
    Assuming Windows users will use WSL/Ubuntu to run builds.

    Args:
      filepath: (str) path to the properties file

      sep: (str) separator character (default =)

      comment_char: (char) comment character 
         (won't read lines that start with this character)
         (default=#)

      returns: (dict) props
    """
    props = {}
    with open(filepath, "rt") as f:
        for line in f:
            l = line.strip()
            if l and not l.startswith(comment_char):
                key_value = l.split(sep)
                key = key_value[0].strip()
                value = sep.join(key_value[1:]).strip().strip('"') 
                props[key] = value 
    return props

def apply_props(props_or_path, *tgts, replace_prop_format='{{0}}'):
   """
   Search and replace all the prop key/values from props
   on all files that match the to_path_glob

   Args:
      props_or_path: (dict|str) dictionary of props to search/replace
         in target files. If passed as a string, will treat
         as a file path and attempt to read

      to_path_glob: (str) file path or glob expression
         for the target files that will be updated, e.g.
         /kubernetes/*.yml

      replace_prop_format: (str) format for what the property
         placeholder strings look like in target files.
         Must have a '0' character, which is where the prop-name
         will go.
   """
   props = load_props(props_or_path) if isinstance(props_or_path, str) else props_or_path

   for f in tgts:

      if not isfile(f):
         continue
      
      with open(f, "rt") as fin:
         content = fin.read()

      for k, v in props.items():
         p = replace_prop_format.replace('0', k) # turn my_prop into {{my_prop}}
         
         # TODO: values for kubernetes secrets need to be base64 encoded
         # don't want to make props file users base64 encode values
         # maybe better to have a separate config-build step just for secrets
         # rather than the detection hack below
         isKubernetesSecretFile = 'kind: Secret' in content

         if isKubernetesSecretFile:
            v = base64.b64encode(v.encode("utf-8")).decode("utf-8")

         content = content.replace(p, v)

      with open(f, "wt") as fout:
         fout.write(content)

if __name__ == "__main__":
   props_file = sys.argv[1]
   tgt_glob = sys.argv[2]

   apply_props(props_file, *sys.argv[2:])