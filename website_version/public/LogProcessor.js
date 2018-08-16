function handleFileSelect(evt) {
  var file = evt.target.files[0]; // FileList object
  // files is a FileList of File objects. List some properties.
  var output = [];
  Papa.parse(file, {
    header: true,
    dynamicTyping: true,
    complete: function(results) {
      output = results;
    //  console.log("output:");
    //  console.log(output["data"]);
      updateTable(output);
    }
  });
}
document.getElementById('files').addEventListener('change', handleFileSelect, false);
var columnNames = ["UserID", "SessionID", "MentorID", "Question", "NPC Answer", "Classifier Answer", "Final Chosen Answer", "Final Video ID", "NPC Editor Confidence", "Classifier Confidence", "Time", "Response Quality", "Better Response ID"]
function updateTable(output){
  var table = document.getElementById('table')
  for (var j = 0; j < output["data"].length-1; j++){
    var row = table.insertRow();
    for (var i = 12; i >= 0; i--){
      var cell1 = row.insertCell(0);
      if (output["data"][j][columnNames[i]]){
        cell1.innerHTML = output["data"][j][columnNames[i]];
      } else if (i ==11){
        var buttonIDs = ["button" + j + "Good", "button" + j + "Decent", "button" + j + "Poor"];
        cell1.innerHTML =   '<button type="button" class="btn btn-success" id =' + buttonIDs[0] + ' style = "margin-top:15px" onclick ="setChoice(this, \'Good\' )">Good Choice</button>'+
                            '<button type="button" class="btn btn-warning" id =' + buttonIDs[1] + ' style = "margin-top:15px" onclick ="setChoice(this, \'Decent\' )">Decent Choice</button>'+
                            '<button type="button" class="btn btn-danger"  id =' + buttonIDs[2] + ' style = "margin-top:15px" onclick ="setChoice(this, \'Poor\' )">Poor Choice</button>';
     } else if (i==12){
        cell1.innerHTML = "<input type='text' class='form-control' id='usr'>"
     }
    }
  }
}
function setChoice(row, choice){
  var btID = row.id.replace("Good","").replace("Decent","").replace("Poor","");
  if (choice == "Good"){
    $("#"+btID + "Good").replaceWith("Good");
    $("#"+btID + "Decent").replaceWith("");
    $("#"+btID + "Poor").replaceWith("");
  } else if (choice == "Decent"){
    $("#"+btID + "Good").replaceWith("");
    $("#"+btID + "Decent").replaceWith("Decent");
    $("#"+btID + "Poor").replaceWith("");
  } else {
    $("#"+btID + "Good").replaceWith("");
    $("#"+btID + "Decent").replaceWith("");
    $("#"+btID + "Poor").replaceWith("Poor");
  }
  console.log()
}
function returnFunction(){
  return 'Are you sure you want to leave? Make sure you downloaded the new file before you leave!';
}
