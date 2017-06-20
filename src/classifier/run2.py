import ensemble
import win32pipe
import win32file
import msvcrt
import os

#mode='npceditor' will fetch answers only from npceditor.
#mode='classifier' will fetch answers only from classifier.
#mode='ensemble' will fetch answers from both classifier and ensemble and decide the best
ec=ensemble.EnsembleClassifier(mode='npceditor')

# open server pipe from Unity
pipe = win32file.CreateFile("\\\\.\\pipe\\pipe_unity", win32pipe.PIPE_ACCESS_DUPLEX, 0, None, win32file.OPEN_EXISTING, 0, None)
read_fd = msvcrt.open_osfhandle(pipe, os.O_RDONLY)
reader = open(read_fd, "r")
input = reader.readline()
write_fd = msvcrt.open_osfhandle(pipe, os.O_WRONLY)
writer = open(write_fd, "w")

print("Interface is ready")
end_flag = False
while end_flag == False:

    print("input = " + input)
    input = input.replace('\r', '')
    input = input.replace('\n', '')

    if input == "_READY_":
        writer.write("_READY_")

    elif input == "_QUIT_":
        writer.write("_QUIT_")
        end_flag = True
        break

    else:
        video_file, transcript = ec.process_input_from_ui(input)
        print(video_file)
        print(transcript)
        writer.write(video_file)
        writer.write("\n")
        writer.write(transcript)

    writer.flush()
    input = reader.readline()

pipe.close()