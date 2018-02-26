import run

run.start('ensemble')
while not run.end_flag:
    output = run.process_input(input())
    print(output)