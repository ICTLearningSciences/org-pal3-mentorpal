import bolt
import bolt_flask
import behave_restful.bolt_behave_restful as bbr

bolt.register_module_tasks(bolt_flask)
bolt.register_module_tasks(bbr)

# Bolt has a provided task sleep that is automatically registered

config = {
    "start-flask": {
        "startup-script": "flask_start.sh",
        "terminate-script": "flask_stop.sh",
    },
    "wait-for-server-running": {
        "url": "http://127.0.0.1:5000/mentor-api/ping",
        "timeout": 15,
    },
    "behave-restful": {
        "directory": "features"  # path to features folder
        # ,'options' : {
        # 	'i': 'features/responds_to_off_topic_with_prompt.feature'
        # }
        # ,'definition': 'yourdefinition',	# if you are using definitions for different environments
    },
}

# Register a task to invoke all that here:

bolt.register_task(
    "test-features", ["start-flask", "wait-for-server-running", "behave-restful"]
)
