import typing


def call_function(function_id: str, callback: typing.Callable[..., None], *args: typing.Any) -> None:
    """
    Call a registered function in VS Code. Upon completion capture the return value and pass that back into a Python function.

    Parameters
    ----------
    function_id : str
        Id of the registered function in VS Code to callback into.
    callback : function
        Function to be inboked with the return value from the VS Code function call.
    *args : iterable, optional
        Positional arguments passed into the VS Code function defined by `function_id`.
    """
    pass
