// Welcome message library

export function welcome() {
  console.log(`                              
              _|_|    _|_|_|  
_|_|_|      _|      _|        
_|    _|  _|_|_|_|  _|        
_|    _|    _|      _|        
_|_|_|      _|        _|_|_|  
_|                            
_|                            
`)
  const user = "color: blue; font-weight: bold";
  const bold = "font-weight: bold;"

  console.log("      passyfire Client")
  console.log("%cWritten by @%cgreysoh%c on GitHub\n", bold, user, bold);
}