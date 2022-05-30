<p align="center">
  <img src="https://res.cloudinary.com/dsry3cnco/image/upload/v1642440780/theyr_logo_axzsjz.png" alt="Theyr Logo"/>
</p>

# Theyr (Twine Multiplayer)
Theyr is an extension to <a href="https://twinery.org/">Twine</a> <a href="http://www.motoslave.net/sugarcube/2/">SugarCube</a> that allows you to create multiplayer stories that update in real time. This works by using sockets to share all SugarCube variables between the connected players. If one variable changes, all players instances will be updated and kept in sync.

Theyr was created to provide a real-time updating multiplayer experience for Twine games. Standalone Twine only provides support for single player stories, but through the SugarCube story format, JavaScript, and  <a href="https://socket.io/">Socket.IO</a>, multiplayer Twine becomes possible. Once you've written your Twine story, all you have to do is follow the instructions below to deploy the application to Heroku and make your game available to play over the web!

## How It Works
If you're familiar with SugarCube, you'll know that the variables for a Twine story are stored within the SugarCube State. In order to provide a multiplayer experience, Theyr uses sockets to ensure that each player's SugarCube State is synchronized with every other player in the game. This happens in realtime, so when one player does something that changes the state of the game, a socket event is sent to all of the other clients to reflect these new changes. <br/><br/>
That's it! You don't need to do anything extra to your Twine- the multiplayer features will come automatically from Theyr.

## Features
- **Multiplayer:** As previously mentioned, the main feature of Theyr is creating Multiplayer Twine stories. 
- **Twine/Twee Hot Reloading:** While the Node server is running, saving an html file will automatically create a twee file and vice versa. So you can easily switch between working in Twine or in Twee.
- **Automatic deployment to Heroku:** Theyr allows you to easily deploy your application to Heroku with a single command. All you need to do is input the required information into the config file and run `node createHerokuInstances` to deploy your app to Heroku.


## What You'll Need to Get Started
1. Install Twine at https://twinery.org/
2. Install Node at https://nodejs.org/en/
3. Create a Heroku account at https://id.heroku.com/login

## Instructions
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

### Create your Twine Story

1. Open template.html in Twine and use it to create your story. Alternatively, you can use the template.twee if you want to create your story using Twee.

### Deploy to Heroku

1. Log in to your Heroku account:
```
lando heroku auth:login
```
2. Create a new Heroku project with a Node buildpack:
```
lando heroku apps:create app-name-here --buildpack heroku/nodejs
```
3. Initialize a git repository and set your Heroku application as a remote:
```
git init
git add -A
git commit -m "Initial commit."
git remote add heroku https://git.heroku.com/app-name-here.git
```
4. Deploy to Heroku
```
git push heroku master
```

## Authors
- [@Alex Lau](https://github.com/meetAlexLau)
    - alexlau347@gmail.com
- [@Timothy Hsu](https://github.com/timothyhsu8)
    - timothy.hsu@stonybrook.edu
