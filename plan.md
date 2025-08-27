# main game concept

This is a web-based multiplayer game. The way the game works is similar to the online game Raddle.quest. Players attempt to join two words together in a chain using clues along the way. You get the first and last words and a bank of clues. You can either start from the top down or bottom up and switch as you go along. All you know for each word you are currently on is the number of letters in the next word, here is an example:

DOWN -----> EARTH
clues in the forward direction (out of order): [
    Cardinal direction that's DOWN on a map, most of the time
    Change the first letter of DOWN to get a part of the body
    Kind of food or music that sounds like DOWN
    Move the first letter of DOWN to the end to get where we are
    Organ that sits inside the DOWN
    Piece of clothing that often has a DOWN
    Popular piano duet “________ & DOWN”
    Rubber layer on the bottom of a DOWN
]

next word after down is 5 letters

answer is SOUTH (hint was: Cardinal direction that's DOWN on a map, most of the time)

next word after south is 5 letters

answer is MOUTH (hint was: Change the first letter of SOUTH to get a part of the body)

Solving from the way up the clues are reversed so:
DOWN <--- EARTH

clues in the reverse direction: [
    Kind of food or music that sounds like ________ → EARTH
    Move the first letter of ________ to the end to get where we are → EARTH
    Organ that sits inside the ________ → EARTH
    Piece of clothing that often has a ________ → EARTH
    Popular piano duet “EARTH & ________”
    Rubber layer on the bottom of a ________ → EARTH
]

next word before earth is 5 letters

Answer is HEART (hint was: Move the first letter of ________ to the end to get where we are → EARTH)

## team based setup

I want to have teams work together to solve these. Initially want it to be a jackbox style setup where everyone joins on their phone with a name of their choice in a lobby and there is an admin page where you control everything, you can see who joins and their names, then the admin selects the number of teams and can start the game, the players have x amount of time to pick their team name and now they are off

Teams now have to compete to solve x number of puzzles in the fastest amount of time. The way people collaborate with each other is by discussing the clues and potential answers in real-time, using their phones to submit answers and see the progress of their team. You can see based on the current clue your team is trying to solve what answer have been submitted, each member can individually try to solve from the forwards or backwards direction. When one person on a team solves a word it solves it for everyone on the team. The team who finishes all their puzzles first wins.

## backend

the backend will be written in fastapi and require both a normal webserver and a websocket server to handle real-time communication between clients. The games will be stored as json files, here is an example of the structure, (not sure if this makes sense right now but will stick with it):
{
    "words": [
        "DOWN",
        "SOUTH",
        "HEART",
        "EARTH"
    ],
    "clues": {
        # DOWN AND EARTH ARE NOT INCLUDED HERE
        "SOUTH": {
            "forward": "CARDINAL DIRECTION THAT'S ____ ON A MAP, MOST OF THE TIME",
            "backward": "CHANGE THE FIRST LETTER OF ________ TO GET A PART OF THE BODY -> MOUTH"
        },
        "HEART": {
            "forward": "ORGAN THAT SITS INSIDE THE ________",
            "backward": "CHANGE THE FIRST LETTER OF ________ TO GET A PART OF THE BODY -> EARTH"
        },
        etc...
    }
}

a sqlite database will be used to track player progress, team information, and game state.
When users join a game, their information will be stored in the database, and their progress will be updated in real-time as they solve puzzles or their teammates solve a puzzle, when a guess is submitted all players on the same team will be notified of the submission.

## frontend

the frontend will be made with react and vite, it should be as bare bones as possible using very basic js and react setups, make sure you are using typescript as well.

## admin page

There should be an admin page where you can control the flow of the game, including starting and stopping the game, viewing player progress, and managing teams.
