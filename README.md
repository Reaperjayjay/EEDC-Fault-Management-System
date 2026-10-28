# Engineer ranking with PyTorch

A small neural network that scores how suitable each available engineer is for
a fault. Your Node backend asks it for scores; if it is switched off or fails,
Node falls back to the rule-based formula, so assignments never stop working.

## 1. Set up (once)

Use a NEW virtual environment. Do not reuse the Rasa one, because Rasa 3.6 pins
older package versions that clash with these.

    cd ai-ranker
    py -3.10 -m venv venv
    venv\Scripts\activate
    pip install --upgrade pip
    pip install -r requirements.txt

## 2. Train the first model

There are no real assignment results yet, so start by teaching the model to
imitate your current formula. This proves the whole pipeline works.

    python train.py --synthetic

It prints the typical error and a rank agreement score and saves
models/model.pt and models/meta.json.

## 3. Start the service

    uvicorn server:app --port 8000

Check http://localhost:8000/health. It should show "status": "ok".

## 4. Switch it on in Node

Add this line to config.env and restart the Node server:

    AI_RANKER_URL=http://localhost:8000

Suggested-engineer and ranking responses now include:
  match_score    the PyTorch score (0 to 100)
  formula_score  the old formula score, for comparison
  ranked_by      "pytorch" or "formula" (formula means the service was unavailable)

## 5. Train on real data (when you have enough)

1. Run export_training_data.sql in MySQL 8 and save the result as real_training.csv
   (with the header row).
2. python train.py --csv real_training.csv
3. Restart uvicorn.

You need hundreds of reviewed assignments, ideally thousands. With fewer, the
model will be unreliable (train.py warns you).

## Limits to know about

- Trained only on synthetic data, the model copies the formula. It becomes
  useful only after training on real reviews.
- Real reviews only exist for engineers who WERE assigned, so the model never
  sees how the engineers who were not chosen would have done. Treat it as a
  helper for admins, not as the final decision-maker.
- Your database does not record the distance at assignment time, so real
  training data has no distance. To fix this, store distance_km (and the match
  score) in the assignments table when an assignment is created.
- features.py contains a copy of the fault-to-specialization table. If you
  change utils/faultSpecialization.js, change it there too and retrain.
