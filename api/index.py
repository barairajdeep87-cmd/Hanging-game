import random
import time
from flask import Flask, jsonify, request, render_template, session

app = Flask(__name__, template_folder='../templates', static_folder='../static')
app.secret_key = "terminal_velocity_secret_key_1337"

# Categories and word lists
CATEGORIES = {
    "ANIMALS": {
        "difficulty": "EASY",
        "hex": "0x01",
        "description": "Natural world entities. Common mammals, birds, and aquatic life forms.",
        "icon": "pets",
        "words": [
            "CAT", "DOG", "ELEPHANT", "GIRAFFE", "MONKEY", "TIGER", "PENGUIN", 
            "DOLPHIN", "KANGAROO", "RABBIT", "KOALA", "PANDA", "CHIMPANZEE", 
            "PLATYPUS", "SQUIRREL", "CHEETAH", "OCTOPUS", "HAMSTER", "LEOPARD"
        ]
    },
    "COUNTRIES": {
        "difficulty": "MEDIUM",
        "hex": "0x02",
        "description": "Geopolitical boundaries. Sovereignties spanning all seven continents.",
        "icon": "public",
        "words": [
            "CANADA", "BRAZIL", "GERMANY", "JAPAN", "AUSTRALIA", "EGYPT", "INDIA", 
            "FRANCE", "ITALY", "MEXICO", "RUSSIA", "SWEDEN", "ARGENTINA", 
            "SINGAPORE", "SWITZERLAND", "THAILAND", "NEW_ZEALAND", "COLOMBIA"
        ]
    },
    "TECH_STACK": {
        "difficulty": "HARD",
        "hex": "0x03",
        "description": "Frameworks, languages, and tools for modern software engineering.",
        "icon": "developer_mode",
        "words": [
            "PYTHON", "JAVASCRIPT", "DOCKER", "KUBERNETES", "POSTGRESQL", "FLASK", 
            "MONGODB", "TYPESCRIPT", "ANGULAR", "NODEJS", "TAILWIND", "GITHUB", 
            "FASTAPI", "WEBPACK", "RUST", "GOLANG", "DJANGO", "REDIS", "REACT"
        ]
    },
    "CYBERPUNK_MOVIES": {
        "difficulty": "MEDIUM",
        "hex": "0x04",
        "description": "Dystopian high-tech, low-life cinematic masterpieces and cult classics.",
        "icon": "precision_manufacturing",
        "words": [
            "MATRIX", "BLADE_RUNNER", "TRON", "AKIRA", "ROBOCOP", "TOTAL_RECALL", 
            "DARK_CITY", "MINORITY_REPORT", "EX_MACHINA", "SNOWPIERCER", 
            "GHOST_IN_THE_SHELL", "ALITA", "METROPOLIS", "ROSEWATER", "ELYSIUM"
        ]
    },
    "PYTHON_STDLIB": {
        "difficulty": "CRITICAL",
        "hex": "0x05",
        "description": "Internal modules and built-in functions of the Python standard library.",
        "icon": "code",
        "words": [
            "ITERTOOLS", "COLLECTIONS", "FUNCTOOLS", "DATETIME", "JSON", "URLLIB", 
            "SUBPROCESS", "THREADING", "MULTIPROCESSING", "ASYNCIO", "SOCKET", 
            "SYS", "MATH", "TRACEBACK", "RE", "OS", "PATHLIB", "WEBBROWSER", "SQLITE"
        ]
    }
}

# Global in-memory leaderboard (persistent for server lifetime)
LEADERBOARD = [
    {"rank": 1, "username": "user_0x9A", "status": "ROOT_ADMIN", "score": 12450},
    {"rank": 2, "username": "user_0xBF", "status": "ENCRYPTOR", "score": 11820},
    {"rank": 3, "username": "user_0x4F", "status": "DECODER", "score": 10905},
    {"rank": 4, "username": "user_0xEE", "status": "CODER", "score": 9420},
    {"rank": 5, "username": "user_0x32", "status": "HACKER", "score": 8110},
    {"rank": 6, "username": "user_0x77", "status": "SCRIPT_KIDDIE", "score": 7950},
    {"rank": 7, "username": "user_0xCA", "status": "USER_LVL_2", "score": 7220},
    {"rank": 8, "username": "user_0xFD", "status": "USER_LVL_2", "score": 6880},
    {"rank": 9, "username": "user_0x21", "status": "GUEST", "score": 5410},
    {"rank": 10, "username": "user_0x60", "status": "GUEST", "score": 4990}
]

def init_stats():
    """Initializes player stats in the session if not present."""
    if "stats" not in session:
        session["stats"] = {
            "total_games": 0,
            "wins": 0,
            "win_rate": 0,
            "current_streak": 0,
            "longest_streak": 0,
            "last_score": 0,
            "avg_guesses": 0.0,
            "total_guesses": 0,
            "most_failed_letter": "Q",
            "letter_fails": {},
            "wins_by_difficulty": {
                "EASY": 0,
                "MEDIUM": 0,
                "HARD": 0,
                "CRITICAL": 0
            }
        }

@app.route("/")
def index():
    init_stats()
    return render_template("index.html")

@app.route("/api/categories")
def get_categories():
    categories_info = {}
    for key, data in CATEGORIES.items():
        categories_info[key] = {
            "difficulty": data["difficulty"],
            "hex": data["hex"],
            "description": data["description"],
            "icon": data["icon"],
            "count": len(data["words"])
        }
    return jsonify(categories_info)

@app.route("/api/start", methods=["POST"])
def start_game():
    init_stats()
    data = request.get_json() or {}
    category_key = data.get("category", "TECH_STACK").upper()
    
    if category_key not in CATEGORIES:
        category_key = "TECH_STACK"
        
    category_data = CATEGORIES[category_key]
    word = random.choice(category_data["words"]).upper()
    
    # Store game state in session
    session["word"] = word
    session["guessed"] = []
    session["remaining_attempts"] = 6
    session["category"] = category_key
    session["start_time"] = time.time()
    
    word_display = ["_" if char.isalpha() else char for char in word]
    
    return jsonify({
        "status": "playing",
        "category": category_key,
        "difficulty": category_data["difficulty"],
        "word_display": word_display,
        "remaining_attempts": 6,
        "guessed_letters": [],
        "elapsed_time": 0
    })

@app.route("/api/guess", methods=["POST"])
def make_guess():
    init_stats()
    if "word" not in session:
        return jsonify({"error": "No active game. Call /api/start first."}), 400
        
    data = request.get_json() or {}
    letter = data.get("letter", "").upper().strip()
    
    if not letter or len(letter) != 1 or not letter.isalpha():
        return jsonify({"error": "Invalid letter. Must be a single alphabet character."}), 400
        
    word = session["word"]
    guessed = session["guessed"]
    remaining_attempts = session["remaining_attempts"]
    category_key = session["category"]
    
    # Calculate time spent so far
    time_spent = int(time.time() - session.get("start_time", time.time()))
    
    if letter in guessed:
        return jsonify({
            "message": "Letter already guessed",
            "word_display": ["_" if char not in guessed else char for char in word],
            "remaining_attempts": remaining_attempts,
            "status": "playing",
            "guessed_letters": guessed
        })
        
    guessed.append(letter)
    session["guessed"] = guessed
    
    is_correct = letter in word
    
    if not is_correct:
        remaining_attempts -= 1
        session["remaining_attempts"] = remaining_attempts
        
        # Track failed letters for statistics
        stats = session["stats"]
        letter_fails = stats.get("letter_fails", {})
        letter_fails[letter] = letter_fails.get(letter, 0) + 1
        stats["letter_fails"] = letter_fails
        
        # Recalculate most failed letter
        if letter_fails:
            stats["most_failed_letter"] = max(letter_fails, key=letter_fails.get)
        session["stats"] = stats
        
    # Check win/loss status
    word_letters = set([char for char in word if char.isalpha()])
    has_won = word_letters.issubset(set(guessed))
    
    status = "playing"
    score_earned = 0
    
    if has_won:
        status = "victory"
        # Update statistics
        stats = session["stats"]
        stats["total_games"] += 1
        stats["wins"] += 1
        stats["current_streak"] += 1
        if stats["current_streak"] > stats["longest_streak"]:
            stats["longest_streak"] = stats["current_streak"]
            
        difficulty = CATEGORIES[category_key]["difficulty"]
        stats["wins_by_difficulty"][difficulty] = stats["wins_by_difficulty"].get(difficulty, 0) + 1
        
        # Compute average guesses
        stats["total_guesses"] += len(guessed)
        stats["avg_guesses"] = round(stats["total_guesses"] / stats["wins"], 1)
        
        # Calculate score: baseline 1000 + attempts * 200 - time_spent * 2
        # Max score capped, min score 100
        score_earned = max(100, 1000 + (remaining_attempts * 200) - (time_spent * 2))
        stats["last_score"] = score_earned
        
        # Update win rate
        stats["win_rate"] = int((stats["wins"] / stats["total_games"]) * 100)
        session["stats"] = stats
        
        # Add to leaderboard if score is high
        username = session.get("username", "user_0xMY")
        add_to_leaderboard(username, score_earned)
        
    elif remaining_attempts <= 0:
        status = "gameover"
        # Update statistics
        stats = session["stats"]
        stats["total_games"] += 1
        stats["current_streak"] = 0
        stats["last_score"] = 0
        stats["win_rate"] = int((stats["wins"] / stats["total_games"]) * 100)
        session["stats"] = stats
        
    word_display = [char if (not char.isalpha() or char in guessed) else "_" for char in word]
    
    return jsonify({
        "letter": letter,
        "correct": is_correct,
        "word_display": word_display,
        "remaining_attempts": remaining_attempts,
        "status": status,
        "guessed_letters": guessed,
        "word": word if status in ["victory", "gameover"] else None,
        "time_spent": time_spent,
        "score_earned": score_earned
    })

@app.route("/api/stats")
def get_stats():
    init_stats()
    stats_data = session["stats"].copy()
    stats_data["username"] = session.get("username", "GUEST")
    return jsonify(stats_data)

@app.route("/api/stats/reset", methods=["POST"])
def reset_stats():
    session.pop("stats", None)
    init_stats()
    return jsonify({"success": True, "stats": session["stats"]})

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    
    # Validate: alphanumeric/underscores, length 3-12
    if not username or len(username) < 3 or len(username) > 12:
        return jsonify({"error": "Username must be 3-12 characters."}), 400
        
    for char in username:
        if not (char.isalnum() or char == '_'):
            return jsonify({"error": "Username must be alphanumeric or underscores."}), 400
            
    session["username"] = username
    init_stats()
    return jsonify({"success": True, "username": username})

@app.route("/api/logout", methods=["POST"])
def logout():
    session.pop("username", None)
    session.pop("word", None)
    session.pop("guessed", None)
    session.pop("remaining_attempts", None)
    session.pop("category", None)
    session.pop("stats", None)
    return jsonify({"success": True})

@app.route("/api/leaderboard")
def get_leaderboard():
    return jsonify(LEADERBOARD)

def add_to_leaderboard(username, score):
    """Inserts a new score in-memory, sorts, and reranks."""
    global LEADERBOARD
    
    # Check if user already exists on leaderboard and has lower score
    user_exists = False
    for entry in LEADERBOARD:
        if entry["username"] == username:
            user_exists = True
            if score > entry["score"]:
                entry["score"] = score
            break
            
    if not user_exists:
        LEADERBOARD.append({
            "username": username,
            "status": "DECODER",
            "score": score
        })
        
    # Sort and re-rank
    LEADERBOARD.sort(key=lambda x: x["score"], reverse=True)
    for index, entry in enumerate(LEADERBOARD):
        entry["rank"] = index + 1
        
    # Cap at top 10
    LEADERBOARD = LEADERBOARD[:10]

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)
