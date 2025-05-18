Option Explicit

Dim msg, style, title, timeout, args, shell

Set shell = CreateObject("WScript.Shell")
Set args  = WScript.Arguments

title   = args(0)
msg     = args(1)
style   = CInt(args(2))
timeout = CInt(args(3))

shell.Popup msg, timeout, title, style

Set shell = Nothing
Set args  = Nothing
