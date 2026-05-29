"""Labels + batches."""

from __future__ import annotations

from panelos_api.db.models.label import Label
from panelos_api.db.models.label_batch import LabelBatch
from panelos_api.repositories.base import BaseRepo


class LabelRepo(BaseRepo[Label]):
    model = Label


class LabelBatchRepo(BaseRepo[LabelBatch]):
    model = LabelBatch
