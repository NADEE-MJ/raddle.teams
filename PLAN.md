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

For each word there are two hints that can be used, the first hint for that direction will let the players know which clue to use for that direction, the next hint will fill in the answer (I think this is too powerful and should be limited in some way, if the players get stuck the admin can help them along) (hints costing a time penalty would be good but it has to be significant)

words are all always capitalized and must be exact matches to the answers

teams will complete all the puzzles assigned to then until they are done they do not wait until the next team is done

## team based setup

I want to have teams work together to solve these. Initially want it to be a jackbox style setup where everyone joins on their phone with a name of their choice in a lobby and there is an admin page where you control everything, you can see who joins and their names, then the admin selects the number of teams and can start the game, players are randomly assigned to a team, the admin can switch the teams if needed, the players have x amount of time to pick their team name and now they are off

Teams now have to compete to solve x number of puzzles in the fastest amount of time. The way people collaborate with each other is by discussing the clues and potential answers in real-time, using their phones to submit answers and see the progress of their team. You can see based on the current clue your team is trying to solve what answer have been submitted, each member can individually try to solve from the forwards or backwards direction. When one person on a team solves a word it solves it for everyone on the team. Teammates should be able to see every guess that every other teammate makes in real time as well as a backlog for the current words being worked on in both the forward and backwards directions. If any clue is solved for a team in the forwards or backwards direction it solves it for everyone on the team, even if they are working on the other direction. The team who finishes all their puzzles first wins.

Submissions are a free for all, whoever submits first gets the credit for solving that part of the puzzle. Need to have some logic for how to handle which requests get handled first for a team.

potentially want to do something where the slowest team per puzzle gets eliminated or maybe everyone solves every puzzle at different times

## backend

use poetry for dependency management

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

there will be one of these json files per puzzle, including a tutorial puzzle

a sqlite database will be used to track player progress, team information, and game state.
When users join a game, their information will be stored in the database, and their progress will be updated in real-time as they solve puzzles or their teammates solve a puzzle, when a guess is submitted all players on the same team will be notified of the submission.

if players disconnect they can rejoin the team that they were previously on, might need to have the admin involved in this somehow or ideally have this happen automatically

websockets should be based on team name or team id, which will be generated at the start of the game. Only one game can be active at a time for now.

All guesses per team should use optimistic locking to prevent overlapping submissions and race conditions, the first person to solve a clue gets their name added next to the word. There should be some sort of lock for when the correct answer is submitted so that no other guesses are processed until the lock is released.
- Lock team submissions for that specific word
- Process the correct answer
- Broadcast to all team members
- Release lock for next word

## frontend

the frontend will be made with react and vite, it should be as bare bones as possible using very basic js and react setups, make sure you are using typescript and tailwind as well.

## admin page

There should be an admin page where you can control the flow of the game, including starting and stopping the game, viewing player progress, and managing teams. There is only one game going at a time, if people join late the admin will sort them into an existing team. Admins should be able to see exactly what a team has in terms of progress (how far they are, how many hints used, etc.)

## building strategy

Phase 1: Core Mechanics

Basic lobby + team assignment
Single puzzle solving with optimistic locking
WebSocket real-time updates

Phase 2: Competition Features

Multiple puzzles + progress tracking
Admin controls + team management
Win conditions

Phase 3: Polish

Hint system + elimination mechanics
Reconnection handling
Enhanced admin dashboard

## future ideas

- Introduce elimination mechanics for teams that fall too far behind.
- Enhance the admin dashboard with more detailed analytics and controls.
- allow early finishers to spectate other teams.
- Add more puzzles and variety in word chains.
- add support for multi word answers (answers with spaces i.e. "NEW YORK")
