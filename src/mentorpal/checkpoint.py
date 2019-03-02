
import os
import datetime
import subprocess

WEBDAV_PATH = "https://webdisk.ict.usc.edu/remote.php/webdav/"
CREDENTIALS_PATH = os.path.join('webdisk_credentials.txt')
with open(CREDENTIALS_PATH, 'r') as credfile:
    lines = credfile.readlines()
    USERNAME=lines[0].strip().replace('\n', '').replace('\r', '')
    PASSWORD=lines[1].strip().replace('\n', '').replace('\r', '')

'''
Trains and saves model to a new checkpoint for the given IClassifier
IClassifier type must implement a train_model method

Args:
    Classifier: IClassifier
        classifier to train and checkpoint
Returns:
    checkpoint: string
        name of checkpoint

'''
def create_checkpoint(classifier):
    date = datetime.datetime.now()
    checkpoint = date.strftime('%Y-%m-%d-%H%M')

    classifier.checkpoint = checkpoint
    classifier.train_model()
    upload_checkpoint(classifier.model_path())

    return checkpoint

def download_checkpoint(path):
    if not os.path.exists(path):
        os.makedirs(path)

    local_topic_model_path = os.path.join(path, 'lstm_topic_model.h5')
    remote_topic_model_path = os.path.join(WEBDAV_PATH, path, 'lstm_topic_model.h5')

    local_fused_model_path = os.path.join(path, 'fused_model.pkl')
    remote_fused_model_path = os.path.join(WEBDAV_PATH, path, 'fused_model.pkl')

    # curl --user 'username:password' -o local/path/to/file webdav_path/path/to/file
    subprocess.call(["curl","--user","{0}:{1}".format(USERNAME, PASSWORD),"-o",local_topic_model_path,remote_topic_model_path])
    subprocess.call(["curl","--user","{0}:{1}".format(USERNAME, PASSWORD),"-o",local_fused_model_path,remote_fused_model_path])

def upload_checkpoint(path):
    if not os.path.exists(path):
        print('checkpoint {0} does not exist'.format(path))
        return False

    # ensure the checkpoint exists on the webdav if it doesn't already
    cur_path = WEBDAV_PATH
    for p in path.split(os.sep):
        cur_path = os.path.join(cur_path, p)
        # curl --user 'username:password' -X MKCOL webdav_path/path/to/checkpoint
        subprocess.call(["curl","--user","{0}:{1}".format(USERNAME, PASSWORD),"-X","MKCOL",cur_path])

    local_topic_model_path = os.path.join(path, 'lstm_topic_model.h5')
    remote_topic_model_path = os.path.join(WEBDAV_PATH, path, 'lstm_topic_model.h5')

    local_fused_model_path = os.path.join(path, 'fused_model.pkl')
    remote_fused_model_path = os.path.join(WEBDAV_PATH, path, 'fused_model.pkl')

    # curl --user 'username:password' -T local/path/to/file webdav_path/path/to/file
    subprocess.call(["curl","--user","{0}:{1}".format(USERNAME, PASSWORD),"-T",local_topic_model_path,remote_topic_model_path])
    subprocess.call(["curl","--user","{0}:{1}".format(USERNAME, PASSWORD),"-T",local_fused_model_path,remote_fused_model_path])