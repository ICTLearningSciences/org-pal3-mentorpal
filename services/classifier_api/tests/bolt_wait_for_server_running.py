import subprocess
import bolt.api as btapi
import requests
import time

class WaitForServerRunning(btapi.Task):
    
    def __init__(self):
        super(WaitForServerRunning, self).__init__()
        self.process = None

    def tear_down(self):
        if self.process:
            self._terminate(self.process)
            
    def _configure(self):
        self.url = self.config.get('url')
        self.delay = self.config.get('delay') or 0
        self.interval = self.config.get('interval') or 0.3
        self.timeout = self.config.get('timeout') or 5

        if not self.url: raise UrlNotSpecifiedError()

    def _execute(self):

        if self.delay > 0:
            time.sleep(self.delay)

        timeout_time = time.time() + self.timeout
        while True:
            try:
                response = requests.request('GET', self.url)

                if response.status_code >= 200 and response.status_code < 400:
                    return
            except:
                pass
            
            if time.time() > timeout_time:
                raise TimeoutError() 
            
            time.sleep(self.interval)

        

    def _popen_script(self, args):
        return subprocess.Popen(args)

    def _terminate(self, process):
        process.terminate()
        
        
def register_tasks(registry):
	registry.register_task('wait-for-server-running', WaitForServerRunning())
        
        
class TimeoutError(btapi.TaskError):
    def __init__(self):
        super(TimeoutError, self).__init()

class UrlNotSpecifiedError(btapi.RequiredConfigurationError):
    def __init__(self):
        super(UrlNotSpecifiedError, self).__init__('url')