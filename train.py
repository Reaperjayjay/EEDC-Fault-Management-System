"""Trains the engineer-ranking model.

    python train.py --synthetic              # bootstrap: imitate the current formula
    python train.py --csv real_training.csv  # real data exported from MySQL
"""
import argparse
import json
import os
from datetime import datetime, timezone

import numpy as np
import torch
from torch import nn

from data import rows_from_csv, spearman, synthetic_rows, to_matrix
from features import FEATURES
from model import RankerNet


def main():
    parser = argparse.ArgumentParser(description="Train the engineer ranking model")
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--synthetic", action="store_true", help="bootstrap on generated data")
    source.add_argument("--csv", help="CSV exported with export_training_data.sql")
    parser.add_argument("--rows", type=int, default=5000, help="synthetic rows to generate")
    parser.add_argument("--epochs", type=int, default=150)
    parser.add_argument("--batch-size", type=int, default=128)
    parser.add_argument("--lr", type=float, default=0.005)
    parser.add_argument("--patience", type=int, default=25, help="stop after this many epochs without improvement")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--out", default="models", help="folder for model.pt and meta.json")
    args = parser.parse_args()

    rows = synthetic_rows(args.rows, args.seed) if args.synthetic else rows_from_csv(args.csv)
    if not rows:
        raise SystemExit("No usable training rows were found.")

    if not args.synthetic and len(rows) < 200:
        print(
            f"WARNING: only {len(rows)} real rows. A neural network needs far more "
            "data than this, so treat the result as unreliable."
        )

    x, y = to_matrix(rows)
    count = len(y)

    # 80% to learn from, 20% to check on rows the model has never seen.
    order = np.random.RandomState(args.seed).permutation(count)
    cut = max(1, int(count * 0.8))
    train_idx, val_idx = order[:cut], order[cut:]
    if len(val_idx) == 0:
        val_idx = train_idx

    x_train = torch.tensor(x[train_idx], dtype=torch.float32)
    y_train = torch.tensor(y[train_idx], dtype=torch.float32)
    x_val = torch.tensor(x[val_idx], dtype=torch.float32)
    y_val = torch.tensor(y[val_idx], dtype=torch.float32)

    torch.manual_seed(args.seed)
    model = RankerNet(len(FEATURES))
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr, weight_decay=1e-5)
    loss_fn = nn.MSELoss()

    best_loss = float("inf")
    best_state = None
    waited = 0

    for epoch in range(1, args.epochs + 1):
        model.train()
        permutation = torch.randperm(len(x_train))

        for start in range(0, len(permutation), args.batch_size):
            batch = permutation[start : start + args.batch_size]
            optimizer.zero_grad()
            loss = loss_fn(model(x_train[batch]), y_train[batch])
            loss.backward()
            optimizer.step()

        model.eval()
        with torch.no_grad():
            val_loss = loss_fn(model(x_val), y_val).item()

        if val_loss < best_loss - 1e-6:
            best_loss = val_loss
            best_state = {key: value.clone() for key, value in model.state_dict().items()}
            waited = 0
        else:
            waited += 1

        if epoch == 1 or epoch % 10 == 0:
            print(f"epoch {epoch:3d}  validation error {val_loss:.5f}")

        if waited >= args.patience:
            print(f"Stopped early at epoch {epoch} (no improvement for {args.patience} epochs).")
            break

    model.load_state_dict(best_state)
    model.eval()
    with torch.no_grad():
        predictions = model(x_val).numpy()

    targets = y_val.numpy()
    rmse_points = float(np.sqrt(np.mean((predictions - targets) ** 2)) * 100)
    rho = spearman(predictions, targets)

    os.makedirs(args.out, exist_ok=True)
    torch.save(model.state_dict(), os.path.join(args.out, "model.pt"))

    meta = {
        "version": datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S"),
        "features": FEATURES,
        "source": "synthetic" if args.synthetic else os.path.basename(args.csv),
        "rows": count,
        "validation_rmse_points": round(rmse_points, 2),
        "validation_spearman": round(rho, 3),
    }
    with open(os.path.join(args.out, "meta.json"), "w", encoding="utf-8") as handle:
        json.dump(meta, handle, indent=2)

    print()
    print(f"Saved {args.out}/model.pt  (version {meta['version']}, {count} rows)")
    print(f"Typical error on unseen rows: about {rmse_points:.1f} points out of 100")
    print(f"Rank agreement with the target (Spearman): {rho:.3f}  (1.0 = identical order)")


if __name__ == "__main__":
    main()
