<p align="center">
  <img src="https://res.cloudinary.com/dsry3cnco/image/upload/v1642440780/theyr_logo_axzsjz.png" alt="Theyr Logo"/>
</p>
Try a [sample demo here](https://theyr-1.herokuapp.com/).
# Theyr (Twine Multiplayer)
Theyr is an extension to <a href="https://twinery.org/">Twine</a> <a href="http://www.motoslave.net/sugarcube/2/">SugarCube</a> that allows you to create multiplayer stories that update in real time. Standalone Twine only provides support for single player stories, but through the SugarCube story format, JavaScript, and  <a href="https://socket.io/">Socket.IO</a>, multiplayer Twine becomes possible. Once you've written your Twine story, all you have to do is follow the instructions below to deploy the application to Heroku and make your game available to play over the web!

## How It Works
If you're familiar with SugarCube, you'll know that the variables for a Twine story are stored within the SugarCube State. In order to provide a multiplayer experience, Theyr uses sockets to ensure that each player's SugarCube State is synchronized with every other player in the game. If one variable changes, all players' instances will be updated and kept in sync <br/><br/>
There is one special variable $userId which gets created at logon can use the convention $user[$userId]["Name"]="Sammy" to set the current user's name and then a Sugarcube for loop to list all users
That's it! You don't need to do anything extra to your Twine- the multiplayer features will come automatically from Theyr.
We've included sample files for posting your theyr project to Heroku, in theory in can be hosted on any server running node.js 

## Features
- **Multiplayer:** The main feature of Theyr is creating Multiplayer Twine stories. 
- **Twine/Twee Hot Reloading:** While the Node server is running, saving an html file will automatically create a twee file and vice versa. So you can easily switch between working in Twine or in Twee.
- **Automatic deployment to Heroku:** Theyr allows you to easily deploy your application to Heroku using a config file and a single command.

## What You'll Need to Get Started
1. Install Twine at https://twinery.org/
2. Install Node at https://nodejs.org/en/
3. (Optional) Create a Heroku account at https://id.heroku.com/login 

# Instructions
### Clone this Github Repository

1. Clone this repository:
```
git clone https://github.com/SBUtltmedia/Theyr.git
```
2. Go into the 'THEIR-multiplayer-twine' directory and run `npm install` to install all of the necessary dependencies:
```
npm install
```
After `npm install` has completed you can run the server with `npm start`. Once the server is running, you can visit your application at http://localhost:53134.
```
npm start
```

### Creating your Twine story

1. If you plan to work in Twine, import template.html into Twine. If you plan to work in Twee, start working in the template.twee file. <b> These template files contain code that is required for multiplayer functionality to work. </b> Also be aware that all html/twee files should be placed in the Twine folder.
2. Write your Twine story. <b> Don't change or remove any of the existing code in Story JavaScript, but feel free to add additional JavaScript code afterwards. </b>
3. If you're working in Twine, export your HTML into the Twine folder. If you're working in Twee, saving the file will automatically generate the HTML file, as long as the server is running.

### Playing your Twine story
1. Open the config.json file
2. Change the twinePath value to Twine/[your_story_here].html
3. <b>(ONLY FOR DISCORD LOGIN)</b> Add the values for ClientId, ClientSecret and Guild ID (Server ID) from your Discord Application
4. Run `npm start` to run the server. When the server is running, saving an html file in the Twine folder will create an identical twee file and vice versa. 
5. Play your app by visiting http://localhost:53134/
<br> <br>

### Easy Deploy to Heroku
1. Make sure the config.json file is correctly filled out, as described in the previous steps
2. Run `heroku login` to login to your Heroku account
3. Run `node createHerokuInstances.js [appname]`. This will deploy a Heroku application with the given app name.
4. Visit the Heroku application by going to your Heroku dashboard and finding the new app.

<b> Note: If you already have a Heroku application with the same app name, it will be overwritten </b>

# Features

### Real-time Updating
Theyr utilizes [live-update](https://github.com/cyrusfirheir/cycy-wrote-custom-macros/tree/master/live-update), a custom macro which allows a passage to be updated in real-time when a SugarCube variable is changed, without needing to reload the passage. 

In order to see real-time changes to a passage when updates occur, place all contents of a passage between <\<liveblock>\> tags like this:
```
<<liveblock>>
  Passage contents here...
<</liveblock>>
```
Passage contents that aren't placed in <\<liveblock>\> tags will not display updates immediately. The Twine passage will either have to be reloaded or revisted in order to observe changes.

<b> Note: We recommend not using <\<textbox\>> tags within <\<liveblock>\>, as it seems to be buggy. </b>
<br> <br>

### Discord Login
In order to log in to a game, you need a screenname. This can be accomplished 2 ways:
1. <b> Standard Login: </b> Enter your screenname upon first entering the site.
2. <b> Discord Login: </b> Login through Discord and have the screenname reflect your Discord name. This comes with the additional benefit of being able to work with data obtained through the Dicsord API. However, it requires the additional setup of create an application in the Discord Developer Portal and setting redirect URLS.

In order to change the login type:
1. Open package.json
2. Change the value of "start" to "nodemon login/" to use <b> standard login</b>. Change the value of "start" to "nodemon loginDiscord" to use <b> Discord login</b>



## Authors
- [@Alex Lau](https://github.com/meetAlexLau)
    - alexlau347@gmail.com
- [@Timothy Hsu](https://github.com/timothyhsu8)
    - timothy.hsu@stonybrook.edu
- [@Paul St. Denis](https://github.com/AlmondBread)
    - Paul.St.Denis@stonybrook.edu
