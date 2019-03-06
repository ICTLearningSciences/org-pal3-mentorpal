## Store checkpoint models here

The models can be downloaded from here: https://webdisk.ict.usc.edu/index.php/s/J7IJMxFuax3SiHo

To access webdisk, you must have a .netrc file:
machine webdisk.ict.usc.edu
login [username]
password [password]

The models should not be committed to version control, so they are ignored by git.

To download the vector models, inside classifier run:

make init-checkpoint

or

make download-checkpoint classifier={classifier} checkpoint={checkpoint}