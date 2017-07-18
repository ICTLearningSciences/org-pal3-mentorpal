#ifndef VHMSG_PYTHON_INTERFACE
#define VHMSG_PYTHON_INTERFACE

#include <Python.h>
#include "vhmsg.h"
#include "vhmsg-tt.h"
using namespace vhmsg;

//ttu_set_bypass_mode

static PyObject *vhmsg_Python_error = NULL;
static PyObject *vhmsg_Python_Listener_cb = NULL;

// forward declarations
PyMODINIT_FUNC initvhmsg_python(void);
static PyObject * vhmsg_python_connect(PyObject *self, PyObject *args);
static PyObject * vhmsg_python_subscribe(PyObject *self, PyObject *args);
static PyObject * vhmsg_python_setPollingMode(PyObject *self, PyObject *args);
static PyObject * vhmsg_python_setListener(PyObject *self, PyObject *args);
static PyObject * vhmsg_python_send(PyObject *self, PyObject *args);
static PyObject * vhmsg_python_poll(PyObject *self, PyObject *args);
static PyObject * vhmsg_python_wait(PyObject *self, PyObject *args);
static PyObject * vhmsg_python_close(PyObject *self, PyObject *args);
static PyObject * vhmsg_python_getServer(PyObject *self, PyObject *args);
static PyObject * vhmsg_python_getPort(PyObject *self, PyObject *args);
static PyObject * vhmsg_python_getScope(PyObject *self, PyObject *args);

static void messageListener(const char* op, const char* args, void* user_data);

static PyMethodDef vhmsg_Python_Methods[] = 
{  
   {"connect",  vhmsg_python_connect, METH_VARARGS,
   "Connects to an activemq service"},

   {"subscribe",  vhmsg_python_subscribe, METH_VARARGS,
   "Listens for a specific type of vhmsg"},

   {"setPollingMode",  vhmsg_python_setPollingMode, METH_VARARGS,
   "Pass 1 if you want polling mode, pass 0 for immediate mode"},

   {"setListener",  vhmsg_python_setListener, METH_VARARGS,
   "Establishes a function in python that will be called from c when a vhmsg is received"},

   {"send",  vhmsg_python_send, METH_VARARGS,
   "Sends a vhmsg"},

   {"poll",  vhmsg_python_poll, METH_VARARGS,
   "Asks for any queued messages"},

   {"wait",  vhmsg_python_wait, METH_VARARGS,
   "Sleeps for x numbers of seconds until a message arrives, then processes all incoming messages."},

   {"close",  vhmsg_python_close, METH_VARARGS,
   "Disconnects from the connection to the activemq service"},

   {"getServer",  vhmsg_python_getServer, METH_VARARGS,
   "Returns the server that you are currently connected to"},

   {"getPort",  vhmsg_python_getPort, METH_VARARGS,
   "Returns the port that you are currently connected to"},

   {"getScope",  vhmsg_python_getScope, METH_VARARGS,
   "Returns the messaging scope that you are in"},

   {NULL, NULL, 0, NULL}
};


PyMODINIT_FUNC initvhmsg_python(void)
{
    PyObject *m;

    m = Py_InitModule("vhmsg_python", vhmsg_Python_Methods);
    if (m == NULL)
        return;

    vhmsg_Python_error = PyErr_NewException("vhmsg_python.error", NULL, NULL);
    Py_INCREF(vhmsg_Python_error);
    PyModule_AddObject(m, "error", vhmsg_Python_error);
}

////////////////
// Connect
////////////////
static PyObject * vhmsg_python_connect(PyObject *self, PyObject *args)
{
   const char* connectionStr = NULL;
   const char* scopeStr = NULL;
   const char* portStr = NULL;
   int retVal = -1;

   if (PyArg_ParseTuple(args, "sss", &connectionStr, &scopeStr, &portStr))
   {
      retVal = vhmsg::ttu_open(connectionStr, scopeStr, portStr);
   }
   return Py_BuildValue("i", retVal);
}

////////////////
// Subscribe
////////////////
static PyObject * vhmsg_python_subscribe(PyObject *self, PyObject *args)
{
   const char* subscriptionStr = NULL;
   int retVal = -1;

   if (PyArg_ParseTuple(args, "s", &subscriptionStr))
   {
      retVal = vhmsg::ttu_register(subscriptionStr);
   }
   return Py_BuildValue("i", retVal);
}

////////////////
// SetPollingMode
////////////////
static PyObject * vhmsg_python_setPollingMode(PyObject *self, PyObject *args)
{
   int mode = NULL;
   int retVal = -1;

   if (PyArg_ParseTuple(args, "i", &mode))
   {
      vhmsg::ttu_set_bypass_mode(mode == 0 ? true : false);
      retVal = 0;
   }
   return Py_BuildValue("i", retVal);
}

////////////////
// Set Listener
////////////////
static PyObject * vhmsg_python_setListener(PyObject *self, PyObject *args)
{
   PyObject *result = NULL;
   PyObject *temp;
   //int retVal = -1;

    ttu_set_client_callback( &messageListener );

    if (PyArg_ParseTuple(args, "O:set_callback", &temp)) 
    {
        if (!PyCallable_Check(temp)) 
        {
            PyErr_SetString(PyExc_TypeError, "parameter must be callable");
            return NULL;
        }
        Py_XINCREF(temp);         /* Add a reference to new callback */
        Py_XDECREF(vhmsg_Python_Listener_cb);  /* Dispose of previous callback */
        vhmsg_Python_Listener_cb = temp;       /* Remember new callback */
        /* Boilerplate to return "None" */
        Py_INCREF(Py_None);
        result = Py_None;
        //retVal = 0;
    }
    return result;//Py_BuildValue("i", retVal);
    //return result;
}

////////////////
// Send
////////////////
static PyObject * vhmsg_python_send(PyObject *self, PyObject *args)
{
   const char* msg = NULL;
   int retVal = -1;

   if (PyArg_ParseTuple(args, "s", &msg))
   {
      retVal = vhmsg::ttu_notify1(msg);
   }
   return Py_BuildValue("i", retVal);
}

////////////////
// Poll
////////////////
static PyObject * vhmsg_python_poll(PyObject *self, PyObject *args)
{
   return Py_BuildValue("i", vhmsg::ttu_poll());
}

////////////////
// Wait
////////////////
static PyObject * vhmsg_python_wait(PyObject *self, PyObject *args)
{
   double waitTime = NULL;
   int retVal = -1;

   if (PyArg_ParseTuple(args, "d", &waitTime))
   {
      retVal = vhmsg::ttu_wait(waitTime);
   }
   return Py_BuildValue("i", retVal);
}

////////////////
// Disconnect
////////////////
static PyObject * vhmsg_python_close(PyObject *self, PyObject *args)
{
   return Py_BuildValue("i", vhmsg::ttu_close());
}


////////////////
// Message Listener
// Called when a vhmsg that you're subscribed to is received
////////////////
static void messageListener(const char* op, const char* args, void* user_data)
{
   PyObject *arglist;
   PyObject *result;
   std::string opPlusArgs = op;
   opPlusArgs += " ";
   opPlusArgs += args;

   /* Time to call the callback */
   arglist = Py_BuildValue("(s)", opPlusArgs.c_str());
   result = PyEval_CallObject(vhmsg_Python_Listener_cb, arglist);
   if (result == NULL)
   {
      PyErr_SetString(PyExc_TypeError, "failed to call python callback function");
      return;
   }

   Py_DECREF(arglist);
}

////////////////
// Get Server
////////////////
static PyObject * vhmsg_python_getServer(PyObject *self, PyObject *args)
{
   return Py_BuildValue("s", vhmsg::ttu_get_server());
}

////////////////
// Get Port
////////////////
static PyObject * vhmsg_python_getPort(PyObject *self, PyObject *args)
{
   return Py_BuildValue("s", vhmsg::ttu_get_port());
}

////////////////
// Get Scope
////////////////
static PyObject * vhmsg_python_getScope(PyObject *self, PyObject *args)
{
   return Py_BuildValue("s", vhmsg::ttu_get_scope());
}

#endif