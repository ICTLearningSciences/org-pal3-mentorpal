import run

run.start('classifier')
run.print_instructions()

while not run.end_flag:
    output = run.process_input(input())
    print(output)
