/*
 * Copyright 2016-2017 Huawei Technologies Co., Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
$(document).ready(function() {

    var USER_SERVICE = "/openoapi/auth/v1/users";
    var ROLE_SERVICE = "/openoapi/auth/v1/roles";
    var $userName = $("#userName");
    var $password = $("#password");
    var $cfPsdError = $("#cfPsdError");
    var $userNameError = $("#userNameError");
    var $passwordError = $("#passwordError");
    var $rolesError = $("#rolesError");
    var roleMap=[];
    function initialPage() {
        /*initial the event*/
        $("#confirm").click(function(e) {
            if (!checkUserRules()) {
                return;
            }
            var data = getCreateUser();
            createUser(data).done(function() {
                window.document.location = "/openoui/user/user.html";
            })
        })
        $("#cancel").click(function(e) {
            window.document.location = "/openoui/user/user.html";
        })
    //get and initialize roles
     getRolesList().done(function(data) {
                                var data = formatRoles(data);
                                   for (var i = 0; i < data.length; i++) {
                                 var html = '<li><input type="checkbox" value="' + data[i].name + '"/>' + data[i].name + '</li>';
                                 $('.mutliSelect ul').append(html);
                                }
                            })
    
    //init listener
		$(".dropdown dt a").on('click', function() {
		  $(".dropdown dd ul").slideToggle('fast');
		});

		$(".dropdown dd ul li a").on('click', function() {
		  $(".dropdown dd ul").hide();
		});

		function getSelectedValue(id) {
		  return $("#" + id).find("dt a span.value").html();
		}

		$(document).bind('click', function(e) {
		  var $clicked = $(e.target);
		  if (!$clicked.parents().hasClass("dropdown")) $(".dropdown dd ul").hide();
		});

		$('.mutliSelect input[type="checkbox"]').on('click', function() {
			if($('.hida')[0].innerHTML=='Please select roles')
			{
			$('.hida')[0].innerHTML='';    
			}
			
		  var title;
		  if($('.multiSel').text() ==='')
		  {
			title = $(this).closest('.mutliSelect').find('input[type="checkbox"]').val(),
			title = $(this).val();
			}
			else
			{
			title = $(this).closest('.mutliSelect').find('input[type="checkbox"]').val(),
			title ="," + $(this).val();
			
			}
			var oldText=$('.hida')[0].innerHTML;
		  if ($(this).is(':checked')) {
			if(oldText.length>0)
			{
				$('.hida')[0].innerHTML=oldText+','+title;
			}
			else
			{
				 $('.hida')[0].innerHTML=title;    
			}

		  } else {
		   
		   var rolesData = oldText.split(',');
		   var rolesList='';
			 for (var i = 0; i < rolesData.length ; i++) {
				   if(title!=rolesData[i])
				   {
					if(i==0 || rolesList.length==0 )
					{
					rolesList=rolesData[i];
					}
					else
					{
					rolesList=rolesList+','+rolesData[i];
					}
				   }
				}
				if(rolesList.length ==0)
				{
					rolesList='Please select roles';
				}
			 $('.hida')[0].innerHTML=rolesList;   
		  
		  }
		});

    }

    function getRolesList() {
        return Rest.http({
            url: ROLE_SERVICE + "?=" + new Date().getTime(),
            type: "GET",
            async: false,
            contentType: 'application/json',
	    dataType: "json"
        })
    }

    function formatRoles(data) {
        var rolesData = [];
        for (var i = 0; i < data.roles.length; i++) {
            var temp = {};
            temp.roleid = data.roles[i].id;
            temp.name = data.roles[i].name;
            rolesData.push(temp);
            roleMap[temp.name]=temp.roleid;
        }
        return rolesData;
    }

    function getCreateUser() {
        var data = {};
        data.userName = $userName.val();
        data.password = $password.val();
        data.description = $("#description").val();
        data.email = "xxxx@xxxx.com";
        //get roles
        var roles=[];
        var rolesData = $('.hida').text().split(',');
        for (var i = 0; i < rolesData.length ; i++) {
            var temp = {};
            temp.name=rolesData[i];
            temp.id=roleMap[rolesData[i]];
            roles.push(temp);
        }
        data.roles=roles;
        return data;
    }

    function createUser(data) {
        return Rest.http({
            url: USER_SERVICE + "?=" + new Date().getTime(),
            type: "POST",
            async: false,
            contentType: 'application/json',
            dataType: "json",
            data: JSON.stringify(data)
        })
    }

    function checkUserRules() {
        if (!checkMandatory()) {
            return false;
        }

        if (!checkCfPassword()) {
            return false;
        }

        if (!checkUserNameRule()) {
            return false;
        }

        if (!checkPasswordRule()) {
            return false;
        }
        return true;
    }

    function checkMandatory() {
        if ($userName.val() == "") {
            showError($userNameError, "Mandatory.");
            return false;
        }

        if ($password.val() == "") {
            showError($passwordError, "Mandatory.");
            return false;
        }
		if($('.hida')[0].innerHTML=='Please select roles')
		{
			showError($rolesError, "Mandatory.");
            return false;
        }
        return true;
    }

    function checkUserNameRule() {
        var username = $userName.val();
        if (!checkLength(5, 30, username)) {
            showError($userNameError, "The user name length should between 5 and 30.");
            return false
        }

        if (!checkOnlySpecials(username, /[0-9]|[a-z]|[A-Z]|_/g)) {
            showError($userNameError, "Only Character(a-z\,A-Z\,0-9,_) is allowed.");
            return false
        }

        if(!checkUderScore(username)) {
            showError($userNameError, 'The character "_" is only allowed in the middle of the user name.');
            return false
        }

        if (!checkNoSpace(username)) {
            showError($userNameError, "The user name should not contain space.");
            return false
        }

        return true
    }

    function checkPasswordRule() {
        var password = $password.val();

        if (!checkLength(8, 32, password)) {
            showError($passwordError, "The password length should between 8 and 32.");
            return false
        }

        if (!checkCotainSpecial(password)) {
            showError($passwordError, "At least contain: one uppercase letter, one lowercase letter, and one digit, one special character;");
            return false
        }

        if (!checkNoContainAndReverse(password, $userName.val())) {
            showError($passwordError, "The password should not contain the user name or reverse.");
            return false
        }

        if (!checkNoSpace(password)) {
            showError($passwordError, "The password should not contain space.");
            return false
        }
        return true
    }

    function checkLength(min, max, str) {
        return str.length >= min && str.length <= max;
    }

    function checkOnlySpecials(str, reg) {
        return str.match(reg) && str.match(reg).length == str.length
    }

    function checkCotainSpecial(password) {
        return password.match(/\~|\`|\@|\#|\$|\%|\^|\&|\*|\-|\_|\=|\+|\||\?|\/|\(|\)|\<|\>|\[|\]|\{|\}|\"|\,|\.|\;|\'|\!/g) != null 
                && password.match(/[0-9]/g) != null && password.match(/[a-z]/g) != null && password.match(/[A-Z]/g) != null;
    }

    function checkUderScore(str) {
        return str.indexOf("_") != 0 && str.lastIndexOf("_") != str.length - 1;
    }

    function checkNoContainAndReverse(str, str2) {
        return str.indexOf(str2) == -1 && str.indexOf(str2.split("").reverse().join("")) == -1;
    }

    function checkNoSpace(str) {
        return str.indexOf(" ") == -1;
    }

    function checkCfPassword() {
        if ($password.val() == $("#cfPassword").val()) {
            return true;
        }
        showError($cfPsdError, "The password is not the same.");
        return false;
    }

    function showError($Obj, message) {
        $Obj.text(message);
        $Obj.css("visibility", "visible");
        setTimeout(function() {
            hideError($Obj);
        }, 5000)
    }

    function hideError($Obj) {
        $Obj.css("visibility", "hidden");
    }

    initialPage();
})
